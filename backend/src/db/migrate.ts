import { pool } from "./pool.js";

async function main() {
  const client = await pool.connect();

  try {
    console.log("Starting migration: Adding account_members table...");

    // Check if table already exists
    const existsResult = await client.query(
      `
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'account_members'
        )
      `,
    );

    if (existsResult.rows[0].exists) {
      console.log("Table account_members already exists. Skipping creation.");
      return;
    }

    // Create account_members table
    await client.query(`
      CREATE TABLE account_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(account_id, user_id)
      );

      CREATE INDEX idx_account_members_account_id ON account_members(account_id);
      CREATE INDEX idx_account_members_user_id ON account_members(user_id);
    `);

    console.log("✅ Migration completed successfully!");
    console.log("   - Created account_members table");
    console.log("   - Created indexes on account_id and user_id");
  } catch (error) {
    console.error("❌ Migration failed:", error);
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
