import { pool } from "./pool.js";

async function main() {
  const client = await pool.connect();

  try {
    console.log("Starting migration: profile, role, and account upgrades...");

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE user_role AS ENUM ('customer', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'customer',
        ADD COLUMN IF NOT EXISTS phone_number TEXT,
        ADD COLUMN IF NOT EXISTS job_title TEXT,
        ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

      UPDATE users
      SET role = 'admin'
      WHERE email = 'julian@vance.corp' AND role <> 'admin';

      CREATE TABLE IF NOT EXISTS account_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(account_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON account_members(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_members_user_id ON account_members(user_id);
    `);

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fatal error during migration:", error);
  process.exitCode = 1;
});
