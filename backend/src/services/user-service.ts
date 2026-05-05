import { pool } from "../db/pool.js";
import type { UserRole } from "../types/domain.js";
import { buildUserSelectFields, getUserColumnSupport } from "./user-columns.js";
import { HttpError } from "../utils/http-error.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number: string | null;
  job_title: string | null;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface UserWithPasswordRow extends UserRow {
  password_hash: string;
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    phoneNumber: row.phone_number,
    jobTitle: row.job_title,
    twoFactorEnabled: row.two_factor_enabled,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getUserProfile(userId: string) {
  const support = await getUserColumnSupport();
  const result = await pool.query<UserRow>(
    `
      SELECT ${buildUserSelectFields(support)}
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "User not found.");
  }

  return mapUser(result.rows[0]);
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    phoneNumber?: string | null;
    jobTitle?: string | null;
    twoFactorEnabled?: boolean;
  },
) {
  const support = await getUserColumnSupport();
  const updates = ["full_name = COALESCE($2, full_name)", "updated_at = NOW()"];
  const params: Array<string | boolean | null> = [
    userId,
    input.name?.trim() || null,
  ];

  let parameterIndex = 3;

  if (support.phoneNumber) {
    updates.push(`phone_number = COALESCE($${parameterIndex}, phone_number)`);
    params.push(normalizeOptionalText(input.phoneNumber));
    parameterIndex += 1;
  }

  if (support.jobTitle) {
    updates.push(`job_title = COALESCE($${parameterIndex}, job_title)`);
    params.push(normalizeOptionalText(input.jobTitle));
    parameterIndex += 1;
  }

  if (support.twoFactorEnabled) {
    updates.push(
      `two_factor_enabled = COALESCE($${parameterIndex}, two_factor_enabled)`,
    );
    params.push(
      typeof input.twoFactorEnabled === "boolean"
        ? input.twoFactorEnabled
        : null,
    );
  }

  const result = await pool.query<UserRow>(
    `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING ${buildUserSelectFields(support)}
    `,
    params,
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "User not found.");
  }

  return mapUser(result.rows[0]);
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  if (input.newPassword.length < 8) {
    throw new HttpError(400, "New password must be at least 8 characters long.");
  }

  const support = await getUserColumnSupport();
  const result = await pool.query<UserWithPasswordRow>(
    `
      SELECT ${buildUserSelectFields(support)}, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  if (!verifyPassword(input.currentPassword, user.password_hash)) {
    throw new HttpError(401, "Current password is incorrect.");
  }

  if (input.currentPassword === input.newPassword) {
    throw new HttpError(
      400,
      "Choose a new password that differs from the current one.",
    );
  }

  await pool.query(
    `
      UPDATE users
      SET password_hash = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, hashPassword(input.newPassword)],
  );

  return { success: true };
}
