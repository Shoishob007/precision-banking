import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import type { TransactionType } from "../types/domain.js";
import type { RealtimePublisher } from "../realtime.js";
import { formatCurrency } from "../utils/format.js";
import { createTransactionRef } from "../utils/ids.js";
import { HttpError } from "../utils/http-error.js";

const MAX_OPTIMISTIC_RETRIES = 5;

interface AccountRow {
  id: string;
  user_id: string;
  account_id: string;
  holder_name: string;
  display_name: string;
  account_type: string;
  balance: number;
  status: "active" | "standard" | "pending" | "locked";
  version: number;
}

interface TransactionRow {
  id: string;
  transaction_ref: string;
  type: TransactionType;
  status: "success" | "failed" | "pending";
  amount: number;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  account_number: string | null;
  source_account_number: string | null;
  destination_account_number: string | null;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  accountId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  metadata?: Record<string, unknown>;
}

function mapAccount(row: AccountRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.display_name,
    type: row.account_type,
    holderName: row.holder_name,
    balance: row.balance,
    status: row.status,
    versionNumber: row.version,
    versionLabel: `v${row.version}`,
  };
}

function mapTransaction(row: TransactionRow) {
  return {
    id: row.id,
    transactionRef: row.transaction_ref,
    type: row.type,
    status: row.status,
    amount: row.amount,
    failureReason: row.failure_reason,
    metadata: row.metadata,
    createdAt: row.created_at,
    processedAt: row.processed_at,
    accountId: row.account_number,
    sourceAccountId: row.source_account_number,
    destinationAccountId: row.destination_account_number,
  };
}

async function getAccountByAccountId(
  client: PoolClient,
  userId: string,
  accountId: string,
) {
  const result = await client.query<AccountRow>(
    `
      SELECT id, user_id, account_id, holder_name, display_name, account_type, balance, status, version
      FROM accounts
      WHERE account_id = $1
        AND (user_id = $2 OR EXISTS (
          SELECT 1 FROM account_members
          WHERE account_id = accounts.id AND user_id = $2 AND role IN ('owner', 'editor')
        ))
      LIMIT 1
    `,
    [accountId, userId],
  );

  return result.rows[0] ?? null;
}

async function insertActivityEvent(
  client: PoolClient,
  input: {
    eventType: "transaction:created" | "balance:updated" | "transaction:failed";
    transactionId?: string | null;
    accountId?: string | null;
    payload: Record<string, unknown>;
  },
) {
  await client.query(
    `
      INSERT INTO activity_events (event_type, transaction_id, account_id, payload)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [
      input.eventType,
      input.transactionId ?? null,
      input.accountId ?? null,
      JSON.stringify(input.payload),
    ],
  );
}

async function insertTransaction(
  client: PoolClient,
  input: {
    transactionRef: string;
    type: TransactionType;
    status: "success" | "failed";
    amount: number;
    accountId?: string | null;
    sourceAccountId?: string | null;
    destinationAccountId?: string | null;
    initiatedByUserId: string;
    failureReason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO transactions (
        transaction_ref,
        type,
        status,
        amount,
        account_id,
        source_account_id,
        destination_account_id,
        initiated_by_user_id,
        failure_reason,
        metadata,
        processed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
      RETURNING id
    `,
    [
      input.transactionRef,
      input.type,
      input.status,
      input.amount,
      input.accountId ?? null,
      input.sourceAccountId ?? null,
      input.destinationAccountId ?? null,
      input.initiatedByUserId,
      input.failureReason ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return result.rows[0].id;
}

async function loadTransactionForUser(userId: string, transactionRef: string) {
  const result = await pool.query<TransactionRow>(
    `
      SELECT
        t.id,
        t.transaction_ref,
        t.type,
        t.status,
        t.amount,
        t.failure_reason,
        t.metadata,
        t.created_at,
        t.processed_at,
        a.account_id AS account_number,
        src.account_id AS source_account_number,
        dest.account_id AS destination_account_number
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts src ON src.id = t.source_account_id
      LEFT JOIN accounts dest ON dest.id = t.destination_account_id
      WHERE t.transaction_ref = $1 AND t.initiated_by_user_id = $2
      LIMIT 1
    `,
    [transactionRef, userId],
  );

  const transaction = result.rows[0];

  if (!transaction) {
    throw new HttpError(404, "Transaction not found.");
  }

  return mapTransaction(transaction);
}

async function recordFailure(
  userId: string,
  input: CreateTransactionInput,
  reason: string,
  realtime: RealtimePublisher,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sourceAccount = input.accountId
      ? await getAccountByAccountId(client, userId, input.accountId)
      : input.sourceAccountId
        ? await getAccountByAccountId(client, userId, input.sourceAccountId)
        : null;

    const destinationAccount = input.destinationAccountId
      ? await getAccountByAccountId(client, userId, input.destinationAccountId)
      : null;

    const transactionRef = createTransactionRef();
    const transactionId = await insertTransaction(client, {
      transactionRef,
      type: input.type,
      status: "failed",
      amount: input.amount,
      accountId: sourceAccount?.id ?? null,
      sourceAccountId: sourceAccount?.id ?? null,
      destinationAccountId: destinationAccount?.id ?? null,
      initiatedByUserId: userId,
      failureReason: reason,
      metadata: {
        ...input.metadata,
        accountId: input.accountId ?? null,
        sourceAccountId: input.sourceAccountId ?? null,
        destinationAccountId: input.destinationAccountId ?? null,
      },
    });

    await insertActivityEvent(client, {
      eventType: "transaction:failed",
      transactionId,
      accountId: sourceAccount?.id ?? null,
      payload: {
        message: `${input.type} failed: ${reason}`,
        metadata: `${formatCurrency(input.amount)} declined`,
        reason,
        accountId:
          sourceAccount?.account_id ??
          input.accountId ??
          input.sourceAccountId ??
          null,
        destinationAccountId:
          destinationAccount?.account_id ?? input.destinationAccountId ?? null,
      },
    });

    await client.query("COMMIT");

    const transaction = await loadTransactionForUser(userId, transactionRef);
    realtime.emitTransactionFailed(userId, { transaction, reason });

    return transaction;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function finalizeSuccess(
  userId: string,
  transactionRef: string,
  updatedAccounts: AccountRow[],
  realtime: RealtimePublisher,
) {
  const transaction = await loadTransactionForUser(userId, transactionRef);

  realtime.emitTransactionCreated(userId, { transaction });

  for (const account of updatedAccounts) {
    realtime.emitBalanceUpdated(userId, { account: mapAccount(account) });
  }

  return {
    transaction,
    updatedAccounts: updatedAccounts.map(mapAccount),
  };
}

async function processDepositOrWithdraw(
  userId: string,
  input: CreateTransactionInput,
  realtime: RealtimePublisher,
) {
  if (!input.accountId) {
    throw new HttpError(400, "accountId is required.");
  }

  const delta = input.type === "deposit" ? input.amount : input.amount * -1;

  for (let attempt = 1; attempt <= MAX_OPTIMISTIC_RETRIES; attempt += 1) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const account = await getAccountByAccountId(
        client,
        userId,
        input.accountId,
      );

      if (!account) {
        throw new HttpError(404, "Account not found.");
      }

      if (account.status === "locked") {
        throw new HttpError(409, "Account is locked.", {
          failureReason: "Account is locked.",
        });
      }

      if (input.type === "withdraw" && account.balance < input.amount) {
        throw new HttpError(409, "Insufficient balance.", {
          failureReason: "Insufficient balance.",
        });
      }

      const updated = await client.query<AccountRow>(
        `
          UPDATE accounts
          SET balance = balance + $1,
              version = version + 1,
              updated_at = NOW()
          WHERE id = $2 AND version = $3 AND balance + $1 >= 0
          RETURNING id, user_id, account_id, holder_name, display_name, account_type, balance, status, version
        `,
        [delta, account.id, account.version],
      );

      if (!updated.rows[0]) {
        await client.query("ROLLBACK");
        continue;
      }

      const transactionRef = createTransactionRef();
      const transactionId = await insertTransaction(client, {
        transactionRef,
        type: input.type,
        status: "success",
        amount: input.amount,
        accountId: account.id,
        initiatedByUserId: userId,
        metadata: {
          ...input.metadata,
          previousVersion: account.version,
          newVersion: updated.rows[0].version,
          accountId: account.account_id,
        },
      });

      await insertActivityEvent(client, {
        eventType: "transaction:created",
        transactionId,
        accountId: account.id,
        payload: {
          message: `${input.type} of ${formatCurrency(input.amount)} completed for ${account.account_id}`,
          metadata: `${input.type === "deposit" ? "+" : "-"}${formatCurrency(input.amount)}`,
        },
      });

      await insertActivityEvent(client, {
        eventType: "balance:updated",
        transactionId,
        accountId: account.id,
        payload: {
          message: `Balance updated for ${account.account_id}`,
          metadata: formatCurrency(updated.rows[0].balance),
          balance: updated.rows[0].balance,
          version: updated.rows[0].version,
        },
      });

      await client.query("COMMIT");
      return finalizeSuccess(userId, transactionRef, updated.rows, realtime);
    } catch (error) {
      await client.query("ROLLBACK");

      if (
        error instanceof HttpError &&
        error.statusCode === 409 &&
        typeof error.details === "object" &&
        error.details !== null &&
        "failureReason" in error.details
      ) {
        const transaction = await recordFailure(
          userId,
          input,
          String(error.details.failureReason),
          realtime,
        );

        throw new HttpError(error.statusCode, error.message, { transaction });
      }

      throw error;
    } finally {
      client.release();
    }
  }

  const transaction = await recordFailure(
    userId,
    input,
    "Concurrent update conflict. Please retry.",
    realtime,
  );
  throw new HttpError(409, "Concurrent update conflict. Please retry.", {
    transaction,
  });
}

async function processTransfer(
  userId: string,
  input: CreateTransactionInput,
  realtime: RealtimePublisher,
) {
  if (!input.sourceAccountId || !input.destinationAccountId) {
    throw new HttpError(
      400,
      "sourceAccountId and destinationAccountId are required.",
    );
  }

  if (input.sourceAccountId === input.destinationAccountId) {
    throw new HttpError(400, "Source and destination accounts must differ.");
  }

  for (let attempt = 1; attempt <= MAX_OPTIMISTIC_RETRIES; attempt += 1) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const accountsResult = await client.query<AccountRow>(
        `
          SELECT id, user_id, account_id, holder_name, display_name, account_type, balance, status, version
          FROM accounts
          WHERE user_id = $1 AND account_id = ANY($2::varchar[])
        `,
        [userId, [input.sourceAccountId, input.destinationAccountId]],
      );

      const source = accountsResult.rows.find(
        (account: AccountRow) => account.account_id === input.sourceAccountId,
      );
      const destination = accountsResult.rows.find(
        (account: AccountRow) =>
          account.account_id === input.destinationAccountId,
      );

      if (!source || !destination) {
        throw new HttpError(404, "Source or destination account not found.");
      }

      if (source.status === "locked" || destination.status === "locked") {
        throw new HttpError(409, "One of the transfer accounts is locked.", {
          failureReason: "One of the transfer accounts is locked.",
        });
      }

      if (source.balance < input.amount) {
        throw new HttpError(409, "Insufficient balance.", {
          failureReason: "Insufficient balance.",
        });
      }

      const orderedUpdates = [source, destination]
        .sort((left, right) => left.account_id.localeCompare(right.account_id))
        .map((account) => ({
          account,
          delta: account.id === source.id ? input.amount * -1 : input.amount,
        }));

      const updatedAccounts: AccountRow[] = [];
      let hadConflict = false;

      for (const entry of orderedUpdates) {
        const updated = await client.query<AccountRow>(
          `
            UPDATE accounts
            SET balance = balance + $1,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $2 AND version = $3 AND balance + $1 >= 0
            RETURNING id, user_id, account_id, holder_name, display_name, account_type, balance, status, version
          `,
          [entry.delta, entry.account.id, entry.account.version],
        );

        if (!updated.rows[0]) {
          hadConflict = true;
          break;
        }

        updatedAccounts.push(updated.rows[0]);
      }

      if (hadConflict) {
        await client.query("ROLLBACK");
        continue;
      }

      if (updatedAccounts.length !== 2) {
        await client.query("ROLLBACK");
        continue;
      }

      const updatedSource = updatedAccounts.find(
        (account) => account.id === source.id,
      );
      const updatedDestination = updatedAccounts.find(
        (account) => account.id === destination.id,
      );

      if (!updatedSource || !updatedDestination) {
        await client.query("ROLLBACK");
        continue;
      }

      const transactionRef = createTransactionRef();
      const transactionId = await insertTransaction(client, {
        transactionRef,
        type: "transfer",
        status: "success",
        amount: input.amount,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        initiatedByUserId: userId,
        metadata: {
          ...input.metadata,
          sourcePreviousVersion: source.version,
          destinationPreviousVersion: destination.version,
          sourceNewVersion: updatedSource.version,
          destinationNewVersion: updatedDestination.version,
          sourceAccountId: source.account_id,
          destinationAccountId: destination.account_id,
        },
      });

      await insertActivityEvent(client, {
        eventType: "transaction:created",
        transactionId,
        accountId: source.id,
        payload: {
          message: `Transfer of ${formatCurrency(input.amount)} created from ${source.account_id} to ${destination.account_id}`,
          metadata: `${formatCurrency(input.amount)} moved`,
        },
      });

      await insertActivityEvent(client, {
        eventType: "balance:updated",
        transactionId,
        accountId: source.id,
        payload: {
          message: `Balance updated for ${source.account_id}`,
          metadata: formatCurrency(updatedSource.balance),
          balance: updatedSource.balance,
          version: updatedSource.version,
        },
      });

      await insertActivityEvent(client, {
        eventType: "balance:updated",
        transactionId,
        accountId: destination.id,
        payload: {
          message: `Balance updated for ${destination.account_id}`,
          metadata: formatCurrency(updatedDestination.balance),
          balance: updatedDestination.balance,
          version: updatedDestination.version,
        },
      });

      await client.query("COMMIT");
      return finalizeSuccess(
        userId,
        transactionRef,
        [updatedSource, updatedDestination],
        realtime,
      );
    } catch (error) {
      await client.query("ROLLBACK");

      if (
        error instanceof HttpError &&
        error.statusCode === 409 &&
        typeof error.details === "object" &&
        error.details !== null &&
        "failureReason" in error.details
      ) {
        const transaction = await recordFailure(
          userId,
          input,
          String(error.details.failureReason),
          realtime,
        );

        throw new HttpError(error.statusCode, error.message, { transaction });
      }

      throw error;
    } finally {
      client.release();
    }
  }

  const transaction = await recordFailure(
    userId,
    input,
    "Concurrent transfer conflict. Please retry.",
    realtime,
  );
  throw new HttpError(409, "Concurrent transfer conflict. Please retry.", {
    transaction,
  });
}

export async function createTransactionForUser(
  userId: string,
  input: CreateTransactionInput,
  realtime: RealtimePublisher,
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new HttpError(400, "amount must be a positive number.");
  }

  if (input.type === "deposit" || input.type === "withdraw") {
    return processDepositOrWithdraw(userId, input, realtime);
  }

  return processTransfer(userId, input, realtime);
}

export async function listTransactionsForUser(
  userId: string,
  options: {
    page: number;
    limit: number;
    type?: TransactionType;
    accountId?: string;
    fromDate?: string;
    toDate?: string;
  },
) {
  const params: Array<string | number> = [userId];
  const filters: string[] = ["t.initiated_by_user_id = $1"];

  if (options.type) {
    params.push(options.type);
    filters.push(`t.type = $${params.length}`);
  }

  if (options.accountId) {
    params.push(options.accountId);
    filters.push(
      `(a.account_id = $${params.length} OR src.account_id = $${params.length} OR dest.account_id = $${params.length})`,
    );
  }

  if (options.fromDate) {
    params.push(options.fromDate);
    filters.push(`t.created_at::date >= $${params.length}::date`);
  }

  if (options.toDate) {
    params.push(options.toDate);
    filters.push(`t.created_at::date <= $${params.length}::date`);
  }

  params.push(options.limit);
  params.push((options.page - 1) * options.limit);

  const result = await pool.query<TransactionRow>(
    `
      SELECT
        t.id,
        t.transaction_ref,
        t.type,
        t.status,
        t.amount,
        t.failure_reason,
        t.metadata,
        t.created_at,
        t.processed_at,
        a.account_id AS account_number,
        src.account_id AS source_account_number,
        dest.account_id AS destination_account_number
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts src ON src.id = t.source_account_id
      LEFT JOIN accounts dest ON dest.id = t.destination_account_id
      WHERE ${filters.join(" AND ")}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts src ON src.id = t.source_account_id
      LEFT JOIN accounts dest ON dest.id = t.destination_account_id
      WHERE ${filters.join(" AND ")}
    `,
    countParams,
  );

  return {
    page: options.page,
    limit: options.limit,
    total: Number(countResult.rows[0]?.count ?? 0),
    items: result.rows.map(mapTransaction),
  };
}

export async function getTransactionByReferenceForUser(
  userId: string,
  transactionRef: string,
) {
  return loadTransactionForUser(userId, transactionRef);
}
