import { pool } from "./pool.js";
import { hashPassword } from "../utils/passwords.js";

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create multiple users
    const julian = await client.query<{ id: string }>(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email)
        DO UPDATE SET full_name = EXCLUDED.full_name,
                      password_hash = EXCLUDED.password_hash,
                      updated_at = NOW()
        RETURNING id
      `,
      ["Julian Vance", "julian@vance.corp", hashPassword("banking123")],
    );

    const alice = await client.query<{ id: string }>(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email)
        DO UPDATE SET full_name = EXCLUDED.full_name,
                      password_hash = EXCLUDED.password_hash,
                      updated_at = NOW()
        RETURNING id
      `,
      ["Alice Thompson", "alice@vance.corp", hashPassword("banking123")],
    );

    const bob = await client.query<{ id: string }>(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email)
        DO UPDATE SET full_name = EXCLUDED.full_name,
                      password_hash = EXCLUDED.password_hash,
                      updated_at = NOW()
        RETURNING id
      `,
      ["Bob Martinez", "bob@vance.corp", hashPassword("banking123")],
    );

    const julianId = julian.rows[0].id;
    const aliceId = alice.rows[0].id;
    const bobId = bob.rows[0].id;

    await client.query(
      `
        INSERT INTO accounts (user_id, account_id, holder_name, display_name, account_type, balance, status, version)
        VALUES
          ($1, 'ACC1001', 'Julian Vance', 'Private Reserve', 'Wealth Management', 1248092.45, 'active', 2),
          ($1, 'ACC1002', 'Vance Corp Operating', 'Daily Operations', 'Personal Checking', 452110.00, 'standard', 2),
          ($1, 'ACC1003', 'Escrow Reserve', 'Escrow Reserve', 'Global Securities', 0.00, 'locked', 1)
        ON CONFLICT (account_id)
        DO UPDATE SET user_id = EXCLUDED.user_id,
                      holder_name = EXCLUDED.holder_name,
                      display_name = EXCLUDED.display_name,
                      account_type = EXCLUDED.account_type,
                      balance = EXCLUDED.balance,
                      status = EXCLUDED.status,
                      version = EXCLUDED.version,
                      updated_at = NOW()
      `,
      [julianId],
    );

    // Add shared account members - ACC1001 and ACC1002 are shared with Alice and Bob
    await client.query(
      `
        INSERT INTO account_members (account_id, user_id, role)
        SELECT a.id, $1, 'editor' FROM accounts a WHERE a.account_id = 'ACC1001'
        ON CONFLICT (account_id, user_id) DO NOTHING
      `,
      [aliceId],
    );

    await client.query(
      `
        INSERT INTO account_members (account_id, user_id, role)
        SELECT a.id, $1, 'viewer' FROM accounts a WHERE a.account_id = 'ACC1001'
        ON CONFLICT (account_id, user_id) DO NOTHING
      `,
      [bobId],
    );

    await client.query(
      `
        INSERT INTO account_members (account_id, user_id, role)
        SELECT a.id, $1, 'editor' FROM accounts a WHERE a.account_id = 'ACC1002'
        ON CONFLICT (account_id, user_id) DO NOTHING
      `,
      [aliceId],
    );

    await client.query(
      `
        INSERT INTO account_members (account_id, user_id, role)
        SELECT a.id, $1, 'editor' FROM accounts a WHERE a.account_id = 'ACC1002'
        ON CONFLICT (account_id, user_id) DO NOTHING
      `,
      [bobId],
    );

    await client.query(
      `
        INSERT INTO transactions (
          transaction_ref,
          type,
          status,
          amount,
          account_id,
          initiated_by_user_id,
          metadata,
          processed_at
        )
        SELECT 'TX-88294-A', 'deposit', 'success', 12450.00, a.id, $1, '{"seed":true}'::jsonb, NOW()
        FROM accounts a
        WHERE a.account_id = 'ACC1001'
        ON CONFLICT (transaction_ref) DO NOTHING
      `,
      [julianId],
    );

    await client.query(
      `
        INSERT INTO transactions (
          transaction_ref,
          type,
          status,
          amount,
          account_id,
          initiated_by_user_id,
          failure_reason,
          metadata,
          processed_at
        )
        SELECT 'TX-88295-B', 'withdraw', 'failed', 2000.00, a.id, $1, 'Insufficient balance', '{"seed":true}'::jsonb, NOW()
        FROM accounts a
        WHERE a.account_id = 'ACC1002'
        ON CONFLICT (transaction_ref) DO NOTHING
      `,
      [julianId],
    );

    await client.query(
      `
        INSERT INTO transactions (
          transaction_ref,
          type,
          status,
          amount,
          source_account_id,
          destination_account_id,
          initiated_by_user_id,
          metadata,
          processed_at
        )
        SELECT 'TX-88296-C', 'transfer', 'success', 540.25, src.id, dest.id, $1, '{"seed":true}'::jsonb, NOW()
        FROM accounts src
        JOIN accounts dest ON dest.account_id = 'ACC1002'
        WHERE src.account_id = 'ACC1001'
        ON CONFLICT (transaction_ref) DO NOTHING
      `,
      [julianId],
    );

    await client.query(
      `
        INSERT INTO activity_events (event_type, transaction_id, account_id, payload)
        SELECT 'balance:updated', t.id, a.id, '{"message":"System ledger synchronized. New balance:","metadata":"$142,504.22"}'::jsonb
        FROM transactions t
        JOIN accounts a ON a.account_id = 'ACC1001'
        WHERE t.transaction_ref = 'TX-88294-A'
        AND NOT EXISTS (
          SELECT 1 FROM activity_events ae WHERE ae.transaction_id = t.id AND ae.event_type = 'balance:updated'
        )
      `,
    );

    await client.query(
      `
        INSERT INTO activity_events (event_type, transaction_id, account_id, payload)
        SELECT 'transaction:created', t.id, a.id, '{"message":"Deposit initiated via SWIFT-MT103. Awaiting node verification.","metadata":"+$12,450.00"}'::jsonb
        FROM transactions t
        JOIN accounts a ON a.account_id = 'ACC1001'
        WHERE t.transaction_ref = 'TX-88294-A'
        AND NOT EXISTS (
          SELECT 1 FROM activity_events ae WHERE ae.transaction_id = t.id AND ae.event_type = 'transaction:created'
        )
      `,
    );

    await client.query(
      `
        INSERT INTO activity_events (event_type, transaction_id, account_id, payload)
        SELECT 'transaction:failed', t.id, a.id, '{"message":"Withdrawal failed due to insufficient balance.","metadata":"-$2,000.00"}'::jsonb
        FROM transactions t
        JOIN accounts a ON a.account_id = 'ACC1002'
        WHERE t.transaction_ref = 'TX-88295-B'
        AND NOT EXISTS (
          SELECT 1 FROM activity_events ae WHERE ae.transaction_id = t.id AND ae.event_type = 'transaction:failed'
        )
      `,
    );

    await client.query("COMMIT");
    console.log("Database seeded successfully.");
    console.log("\n=== Test User Accounts ===");
    console.log("Owner: julian@vance.corp / banking123");
    console.log(
      "Collaborator: alice@vance.corp / banking123 (editor on ACC1001, ACC1002)",
    );
    console.log(
      "Collaborator: bob@vance.corp / banking123 (viewer on ACC1001, editor on ACC1002)",
    );
    console.log("\n=== Shared Accounts ===");
    console.log("ACC1001: Shared with Alice (editor) and Bob (viewer)");
    console.log("ACC1002: Shared with Alice (editor) and Bob (editor)");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed database.", error);
  process.exitCode = 1;
});
