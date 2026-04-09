import { pool } from "../db/pool.js";
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
  };
}

export async function listAccountsForUser(userId: string) {
  const result = await pool.query<AccountRow>(
    `
      SELECT DISTINCT 
        a.id, a.account_id, a.display_name, a.account_type, a.holder_name, a.balance, a.status, a.version,
        (SELECT COUNT(*) FROM account_members WHERE account_id = a.id) as member_count,
        EXISTS (SELECT 1 FROM account_members WHERE account_id = a.id) as has_members
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
        (SELECT COUNT(*) FROM account_members WHERE account_id = a.id) as member_count,
        EXISTS (SELECT 1 FROM account_members WHERE account_id = a.id) as has_members
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
