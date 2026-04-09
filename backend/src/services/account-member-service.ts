import { pool } from "../db/pool.js";
import { HttpError } from "../utils/http-error.js";

interface AccountMemberRow {
  id: string;
  user_id: string;
  account_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
}

export interface AccountMember {
  id: string;
  userId: string;
  accountId: string;
  role: "owner" | "editor" | "viewer";
  user: {
    name: string;
    email: string;
  };
  createdAt: string;
}

function mapMember(
  row: AccountMemberRow & { full_name: string; email: string },
): AccountMember {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    role: row.role,
    user: {
      name: row.full_name,
      email: row.email,
    },
    createdAt: row.created_at,
  };
}

export async function listAccountMembers(userId: string, accountId: string) {
  // Verify user has access to this account
  const accountResult = await pool.query(
    `
      SELECT id FROM accounts
      WHERE account_id = $1
        AND (user_id = $2 OR EXISTS (
          SELECT 1 FROM account_members
          WHERE account_id = accounts.id AND user_id = $2
        ))
      LIMIT 1
    `,
    [accountId, userId],
  );

  if (!accountResult.rows[0]) {
    throw new HttpError(404, "Account not found.");
  }

  const result = await pool.query<AccountMemberRow & UserRow>(
    `
      WITH target_account AS (
        SELECT id, user_id
        FROM accounts
        WHERE account_id = $1
        LIMIT 1
      ),
      owner_member AS (
        SELECT
          a.id AS id,
          a.user_id AS user_id,
          a.id AS account_id,
          'owner'::varchar(32) AS role,
          NOW()::timestamptz AS created_at,
          NOW()::timestamptz AS updated_at,
          u.full_name,
          u.email
        FROM target_account a
        JOIN users u ON u.id = a.user_id
      ),
      shared_members AS (
        SELECT
          am.id,
          am.user_id,
          am.account_id,
          am.role,
          am.created_at,
          am.updated_at,
          u.full_name,
          u.email
        FROM account_members am
        JOIN users u ON u.id = am.user_id
        JOIN target_account a ON a.id = am.account_id
      )
      SELECT *
      FROM owner_member
      UNION ALL
      SELECT *
      FROM shared_members
      ORDER BY created_at ASC
    `,
    [accountId],
  );

  return result.rows.map(mapMember);
}

export async function addAccountMember(
  userId: string,
  accountId: string,
  targetUserEmail: string,
  role: "owner" | "editor" | "viewer",
) {
  // Verify requesting user is account owner
  const accountResult = await pool.query(
    `
      SELECT id, user_id FROM accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
  );

  const account = accountResult.rows[0];
  if (!account) {
    throw new HttpError(404, "Account not found.");
  }

  if (account.user_id !== userId) {
    throw new HttpError(403, "Only account owner can add members.");
  }

  // Find target user by email
  const userResult = await pool.query<UserRow>(
    `SELECT id, full_name, email FROM users WHERE email = $1 LIMIT 1`,
    [targetUserEmail],
  );

  const targetUser = userResult.rows[0];
  if (!targetUser) {
    throw new HttpError(404, "User not found.");
  }

  // Check if already a member
  const existingResult = await pool.query(
    `
      SELECT id FROM account_members
      WHERE account_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [account.id, targetUser.id],
  );

  if (existingResult.rows[0]) {
    throw new HttpError(409, "User is already a member of this account.");
  }

  // Add member
  const result = await pool.query<AccountMemberRow & UserRow>(
    `
      WITH inserted AS (
        INSERT INTO account_members (account_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, account_id, role, created_at, updated_at
      )
      SELECT i.id, i.user_id, i.account_id, i.role, i.created_at, i.updated_at, u.full_name, u.email
      FROM inserted i
      JOIN users u ON u.id = i.user_id
    `,
    [account.id, targetUser.id, role],
  );

  if (result.rows[0]) {
    return mapMember(result.rows[0]);
  }

  throw new HttpError(500, "Failed to add account member.");
}

export async function removeAccountMember(
  userId: string,
  accountId: string,
  memberUserId: string,
) {
  // Verify requesting user is account owner
  const accountResult = await pool.query(
    `
      SELECT id, user_id FROM accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
  );

  const account = accountResult.rows[0];
  if (!account) {
    throw new HttpError(404, "Account not found.");
  }

  if (account.user_id !== userId) {
    throw new HttpError(403, "Only account owner can remove members.");
  }

  // Don't allow removing owner
  if (memberUserId === account.user_id) {
    throw new HttpError(400, "Cannot remove account owner.");
  }

  const result = await pool.query(
    `
      DELETE FROM account_members
      WHERE account_id = $1 AND user_id = $2
      RETURNING id
    `,
    [account.id, memberUserId],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "Member not found on this account.");
  }
}

export async function updateMemberRole(
  userId: string,
  accountId: string,
  memberUserId: string,
  newRole: "owner" | "editor" | "viewer",
) {
  // Verify requesting user is account owner
  const accountResult = await pool.query(
    `
      SELECT id, user_id FROM accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
  );

  const account = accountResult.rows[0];
  if (!account) {
    throw new HttpError(404, "Account not found.");
  }

  if (account.user_id !== userId) {
    throw new HttpError(403, "Only account owner can update member roles.");
  }

  // Don't allow changing owner role
  if (memberUserId === account.user_id) {
    throw new HttpError(400, "Cannot change owner role.");
  }

  const result = await pool.query<AccountMemberRow & UserRow>(
    `
      UPDATE account_members
      SET role = $3, updated_at = NOW()
      WHERE account_id = $1 AND user_id = $2
      RETURNING id, user_id, account_id, role, created_at, updated_at
    `,
    [account.id, memberUserId, newRole],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "Member not found on this account.");
  }

  // Fetch user details for mapping
  const userResult = await pool.query<UserRow>(
    `SELECT id, full_name, email FROM users WHERE id = $1`,
    [memberUserId],
  );

  if (userResult.rows[0]) {
    return mapMember({ ...result.rows[0], ...userResult.rows[0] });
  }

  throw new HttpError(500, "Failed to update member role.");
}
