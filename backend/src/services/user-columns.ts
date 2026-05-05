import { pool } from "../db/pool.js";

interface UserColumnSupport {
  role: boolean;
  phoneNumber: boolean;
  jobTitle: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: boolean;
}

let cachedSupport: UserColumnSupport | null = null;

export async function getUserColumnSupport(): Promise<UserColumnSupport> {
  if (cachedSupport) {
    return cachedSupport;
  }

  const result = await pool.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `,
  );

  const columns = new Set(result.rows.map((row) => row.column_name));

  cachedSupport = {
    role: columns.has("role"),
    phoneNumber: columns.has("phone_number"),
    jobTitle: columns.has("job_title"),
    twoFactorEnabled: columns.has("two_factor_enabled"),
    lastLoginAt: columns.has("last_login_at"),
  };

  return cachedSupport;
}

export function buildUserSelectFields(support: UserColumnSupport) {
  return [
    "id",
    "full_name",
    "email",
    support.role ? "role" : "'customer'::text AS role",
    support.phoneNumber
      ? "phone_number"
      : "NULL::text AS phone_number",
    support.jobTitle ? "job_title" : "NULL::text AS job_title",
    support.twoFactorEnabled
      ? "two_factor_enabled"
      : "FALSE AS two_factor_enabled",
    support.lastLoginAt
      ? "last_login_at"
      : "NULL::timestamptz AS last_login_at",
    "created_at",
  ].join(", ");
}
