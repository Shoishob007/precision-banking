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

export async function listAccountsForUser(userId: string) {
  const result = await pool.query<AccountRow>(
    `
      SELECT id, account_id, display_name, account_type, holder_name, balance, status, version
      FROM accounts
      WHERE user_id = $1
      ORDER BY account_id ASC
    `,
    [userId],
  );

  return result.rows.map(mapAccount);
}

export async function getAccountForUser(userId: string, accountId: string) {
  const result = await pool.query<AccountRow>(
    `
      SELECT id, account_id, display_name, account_type, holder_name, balance, status, version
      FROM accounts
      WHERE user_id = $1 AND account_id = $2
      LIMIT 1
    `,
    [userId, accountId],
  );

  const account = result.rows[0];

  if (!account) {
    throw new HttpError(404, "Account not found.");
  }

  return mapAccount(account);
}
