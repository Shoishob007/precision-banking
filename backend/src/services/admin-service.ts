import { pool } from "../db/pool.js";
import type { AccountStatus, UserRole } from "../types/domain.js";
import { HttpError } from "../utils/http-error.js";

interface SummaryRow {
  total_users: string;
  total_accounts: string;
  total_transactions: string;
  locked_accounts: string;
  shared_accounts: string;
  total_balance: string;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  two_factor_enabled?: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface AccountRow {
  id: string;
  account_id: string;
  display_name: string;
  account_type?: string;
  holder_name: string;
  balance: string;
  status: AccountStatus;
  version: number;
  owner_name: string | null;
  updated_at?: string;
  member_count?: string;
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    twoFactorEnabled: row.two_factor_enabled ?? false,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapAccount(row: AccountRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.display_name,
    type: row.account_type ?? "Standard Account",
    holderName: row.holder_name,
    balance: Number(row.balance),
    status: row.status,
    versionNumber: row.version,
    versionLabel: `v${row.version}`,
    ownerName: row.owner_name ?? "Unassigned",
    updatedAt: row.updated_at ?? null,
    memberCount: Number(row.member_count ?? 0),
  };
}

export async function getAdminSummary() {
  const [summaryResult, usersResult, accountsResult, transactionsResult] =
    await Promise.all([
      pool.query<SummaryRow>(
        `
          SELECT
            (SELECT COUNT(*)::text FROM users) AS total_users,
            (SELECT COUNT(*)::text FROM accounts) AS total_accounts,
            (SELECT COUNT(*)::text FROM transactions) AS total_transactions,
            (SELECT COUNT(*)::text FROM accounts WHERE status = 'locked') AS locked_accounts,
            (SELECT COUNT(DISTINCT account_id)::text FROM account_members) AS shared_accounts,
            (SELECT COALESCE(SUM(balance), 0)::text FROM accounts) AS total_balance
        `,
      ),
      pool.query<UserRow>(
        `
          SELECT id, full_name, email, role, two_factor_enabled, created_at, last_login_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 6
        `,
      ),
      pool.query<AccountRow>(
        `
          SELECT a.id, a.account_id, a.display_name, a.account_type, a.holder_name, a.balance::text, a.status, a.version, a.updated_at, u.full_name AS owner_name,
            (SELECT COUNT(*)::text FROM account_members am WHERE am.account_id = a.id) AS member_count
          FROM accounts a
          LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.updated_at DESC
        `,
      ),
      pool.query<{ type: string; total: string }>(
        `
          SELECT type, COUNT(*)::text AS total
          FROM transactions
          GROUP BY type
          ORDER BY total DESC
        `,
      ),
    ]);

  const summary = summaryResult.rows[0];

  return {
    metrics: {
      totalUsers: Number(summary.total_users),
      totalAccounts: Number(summary.total_accounts),
      totalTransactions: Number(summary.total_transactions),
      lockedAccounts: Number(summary.locked_accounts),
      sharedAccounts: Number(summary.shared_accounts),
      totalBalance: Number(summary.total_balance),
    },
    recentUsers: usersResult.rows.map(mapUser),
    managedAccounts: accountsResult.rows.map(mapAccount),
    transactionMix: transactionsResult.rows.map((row) => ({
      type: row.type,
      total: Number(row.total),
    })),
  };
}

export async function updateAccountStatusAsAdmin(
  accountId: string,
  status: AccountStatus,
) {
  if (!["active", "standard", "pending", "locked"].includes(status)) {
    throw new HttpError(400, "Invalid account status.");
  }

  const result = await pool.query<AccountRow>(
    `
      UPDATE accounts
      SET status = $2,
          updated_at = NOW()
      WHERE account_id = $1
      RETURNING id, account_id, display_name, account_type, holder_name, balance::text, status, version, updated_at,
        (SELECT full_name FROM users WHERE id = accounts.user_id) AS owner_name,
        (SELECT COUNT(*)::text FROM account_members am WHERE am.account_id = accounts.id) AS member_count
    `,
    [accountId, status],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "Account not found.");
  }

  return mapAccount(result.rows[0]);
}

export async function listAdminAccounts(options: {
  page: number;
  limit: number;
  query?: string;
  sortBy?: "updated" | "balance" | "owner" | "account";
  sortDirection?: "asc" | "desc";
}) {
  const params: Array<string | number> = [];
  const filters: string[] = [];
  const query = options.query?.trim();

  if (query) {
    const tokens = query.split(/\s+/).filter(Boolean);
    const freeText: string[] = [];

    for (const token of tokens) {
      const statusMatch = token.match(/^status:(active|standard|pending|locked)$/i);
      if (statusMatch) {
        params.push(statusMatch[1].toLowerCase());
        filters.push(`a.status = $${params.length}`);
        continue;
      }

      const ownerMatch = token.match(/^owner:(.+)$/i);
      if (ownerMatch) {
        params.push(`%${ownerMatch[1].trim()}%`);
        filters.push(`COALESCE(u.full_name, '') ILIKE $${params.length}`);
        continue;
      }

      const holderMatch = token.match(/^holder:(.+)$/i);
      if (holderMatch) {
        params.push(`%${holderMatch[1].trim()}%`);
        filters.push(`a.holder_name ILIKE $${params.length}`);
        continue;
      }

      const typeMatch = token.match(/^type:(.+)$/i);
      if (typeMatch) {
        params.push(`%${typeMatch[1].trim()}%`);
        filters.push(`a.account_type ILIKE $${params.length}`);
        continue;
      }

      const balanceMatch = token.match(/^balance(>=|<=|>|<|=)(\d+(?:\.\d+)?)$/i);
      if (balanceMatch) {
        params.push(Number(balanceMatch[2]));
        filters.push(`a.balance ${balanceMatch[1]} $${params.length}`);
        continue;
      }

      const sharedMatch = token.match(/^shared:(yes|no)$/i);
      if (sharedMatch) {
        filters.push(
          sharedMatch[1].toLowerCase() === "yes"
            ? `EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = a.id)`
            : `NOT EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = a.id)`,
        );
        continue;
      }

      freeText.push(token);
    }

    if (freeText.length > 0) {
      const searchValue = `%${freeText.join(" ")}%`;
      params.push(searchValue);
      const position = params.length;
      filters.push(
        `(a.account_id ILIKE $${position} OR a.display_name ILIKE $${position} OR a.holder_name ILIKE $${position} OR a.account_type ILIKE $${position} OR COALESCE(u.full_name, '') ILIKE $${position})`,
      );
    }
  }

  const sortByMap = {
    updated: "a.updated_at",
    balance: "a.balance",
    owner: "u.full_name",
    account: "a.account_id",
  } as const;

  const sortColumn = sortByMap[options.sortBy ?? "updated"] ?? "a.updated_at";
  const sortDirection =
    options.sortDirection?.toLowerCase() === "asc" ? "ASC" : "DESC";

  params.push(options.limit);
  params.push((options.page - 1) * options.limit);

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const result = await pool.query<AccountRow>(
    `
      SELECT
        a.id,
        a.account_id,
        a.display_name,
        a.account_type,
        a.holder_name,
        a.balance::text,
        a.status,
        a.version,
        a.updated_at,
        u.full_name AS owner_name,
        (SELECT COUNT(*)::text FROM account_members am WHERE am.account_id = a.id) AS member_count
      FROM accounts a
      LEFT JOIN users u ON u.id = a.user_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}, a.account_id ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params,
  );

  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM accounts a
      LEFT JOIN users u ON u.id = a.user_id
      ${whereClause}
    `,
    params.slice(0, -2),
  );

  return {
    page: options.page,
    limit: options.limit,
    total: Number(countResult.rows[0]?.count ?? 0),
    items: result.rows.map(mapAccount),
  };
}

export async function listAdminUsers(options: {
  page: number;
  limit: number;
  query?: string;
}) {
  const params: Array<string | number> = [];
  const filters: string[] = [];
  const query = options.query?.trim();

  if (query) {
    const roleMatch = query.match(/role:(customer|admin)/i);
    if (roleMatch) {
      params.push(roleMatch[1].toLowerCase());
      filters.push(`role = $${params.length}`);
    }

    const freeText = query
      .replace(/role:(customer|admin)/gi, "")
      .trim();

    if (freeText) {
      params.push(`%${freeText}%`);
      filters.push(
        `(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }
  }

  params.push(options.limit);
  params.push((options.page - 1) * options.limit);
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const result = await pool.query<UserRow>(
    `
      SELECT id, full_name, email, role, two_factor_enabled, created_at, last_login_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params,
  );

  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM users
      ${whereClause}
    `,
    params.slice(0, -2),
  );

  return {
    page: options.page,
    limit: options.limit,
    total: Number(countResult.rows[0]?.count ?? 0),
    items: result.rows.map(mapUser),
  };
}

export async function updateUserRoleAsAdmin(
  userId: string,
  role: UserRole,
) {
  if (!["customer", "admin"].includes(role)) {
    throw new HttpError(400, "Invalid user role.");
  }

  const result = await pool.query<UserRow>(
    `
      UPDATE users
      SET role = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, two_factor_enabled, created_at, last_login_at
    `,
    [userId, role],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "User not found.");
  }

  return mapUser(result.rows[0]);
}
