import { pool } from "../db/pool.js";
import type { AccountStatus } from "../types/domain.js";
import { createAccountNumber } from "../utils/ids.js";
import { HttpError } from "../utils/http-error.js";

interface AccountRow {
  id: string;
  account_id: string;
  display_name: string;
  account_type: string;
  holder_name: string;
  balance: number;
  status: "active" | "standard" | "pending" | "locked";
  version: number;
  member_count?: number;
  has_members?: boolean;
  user_role?: "owner" | "editor" | "viewer";
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
    memberCount: row.member_count ?? 0,
    isShared: (row.has_members ?? false) || (row.member_count ?? 0) > 0,
    userRole: row.user_role,
  };
}

async function ensureUserOwnsAccount(userId: string, accountId: string) {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM accounts
      WHERE account_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [accountId, userId],
  );

  if (!result.rows[0]) {
    throw new HttpError(403, "Only the account owner can manage this account.");
  }
}

export async function listAccountsForUser(userId: string) {
  const result = await pool.query<AccountRow>(
    `
      SELECT DISTINCT 
        a.id, a.account_id, a.display_name, a.account_type, a.holder_name, a.balance, a.status, a.version,
        (SELECT COUNT(*)::int FROM account_members WHERE account_id = a.id) as member_count,
        EXISTS (SELECT 1 FROM account_members WHERE account_id = a.id) as has_members,
        CASE
          WHEN a.user_id = $1 THEN 'owner'
          ELSE (
            SELECT am.role
            FROM account_members am
            WHERE am.account_id = a.id AND am.user_id = $1
            LIMIT 1
          )
        END as user_role
      FROM accounts a
      WHERE a.user_id = $1
        OR EXISTS (
          SELECT 1 FROM account_members am
          WHERE am.account_id = a.id AND am.user_id = $1 AND am.role IN ('owner', 'editor', 'viewer')
        )
      ORDER BY a.account_id ASC
    `,
    [userId],
  );

  return result.rows.map(mapAccount);
}

export async function getAccountForUser(userId: string, accountId: string) {
  const result = await pool.query<AccountRow>(
    `
      SELECT 
        a.id, a.account_id, a.display_name, a.account_type, a.holder_name, a.balance, a.status, a.version,
        (SELECT COUNT(*)::int FROM account_members WHERE account_id = a.id) as member_count,
        EXISTS (SELECT 1 FROM account_members WHERE account_id = a.id) as has_members,
        CASE
          WHEN a.user_id = $2 THEN 'owner'
          ELSE (
            SELECT am.role
            FROM account_members am
            WHERE am.account_id = a.id AND am.user_id = $2
            LIMIT 1
          )
        END as user_role
      FROM accounts a
      WHERE a.account_id = $1
        AND (a.user_id = $2 OR EXISTS (
          SELECT 1 FROM account_members
          WHERE account_id = a.id AND user_id = $2 AND role IN ('owner', 'editor', 'viewer')
        ))
      LIMIT 1
    `,
    [accountId, userId],
  );

  const account = result.rows[0];

  if (!account) {
    throw new HttpError(404, "Account not found.");
  }

  return mapAccount(account);
}

export async function createAccountForUser(
  userId: string,
  input: {
    name: string;
    type: string;
    openingBalance?: number;
  },
) {
  const ownerResult = await pool.query<{ full_name: string }>(
    `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  if (!ownerResult.rows[0]) {
    throw new HttpError(404, "User not found.");
  }

  const openingBalance = Number(input.openingBalance ?? 0);

  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    throw new HttpError(400, "openingBalance must be zero or greater.");
  }

  const result = await pool.query<AccountRow>(
    `
      INSERT INTO accounts (
        user_id,
        account_id,
        holder_name,
        display_name,
        account_type,
        balance,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, account_id, display_name, account_type, holder_name, balance, status, version
    `,
    [
      userId,
      createAccountNumber(),
      ownerResult.rows[0].full_name,
      input.name.trim(),
      input.type.trim(),
      openingBalance,
    ],
  );

  return mapAccount(result.rows[0]);
}

export async function updateOwnAccountStatus(
  userId: string,
  accountId: string,
  status: Extract<AccountStatus, "active" | "locked" | "standard">,
) {
  if (!["active", "locked", "standard"].includes(status)) {
    throw new HttpError(400, "Status must be active, standard, or locked.");
  }

  await ensureUserOwnsAccount(userId, accountId);

  const result = await pool.query<AccountRow>(
    `
      UPDATE accounts
      SET status = $3,
          updated_at = NOW()
      WHERE account_id = $1
        AND user_id = $2
      RETURNING id, account_id, display_name, account_type, holder_name, balance, status, version
    `,
    [accountId, userId, status],
  );

  return mapAccount(result.rows[0]);
}
