import jwt from "jsonwebtoken";
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import type { AuthTokenPayload } from "../types/domain.js";
import { createAccountNumber } from "../utils/ids.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";
import { HttpError } from "../utils/http-error.js";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
}

interface UserWithPasswordRow extends UserRow {
  password_hash: string;
}

function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "1d" });
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
  };
}

async function createStarterAccounts(
  client: PoolClient,
  userId: string,
  holderName: string,
) {
  const starterAccounts = [
    {
      displayName: "Primary Operations",
      accountType: "Personal Checking",
      balance: 12500,
      status: "active",
    },
    {
      displayName: "Secondary Reserve",
      accountType: "Savings",
      balance: 4000,
      status: "standard",
    },
    {
      displayName: "Escrow Reserve",
      accountType: "Protected Reserve",
      balance: 0,
      status: "locked",
    },
  ] as const;

  for (const account of starterAccounts) {
    await client.query(
      `
        INSERT INTO accounts (user_id, account_id, holder_name, display_name, account_type, balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        userId,
        createAccountNumber(),
        holderName,
        account.displayName,
        account.accountType,
        account.balance,
        account.status,
      ],
    );
  }
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query<UserRow>(
      `SELECT id, full_name, email FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows[0]) {
      throw new HttpError(409, "Email already registered.");
    }

    const result = await client.query<UserRow>(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, full_name, email
      `,
      [input.name.trim(), email, hashPassword(input.password)],
    );

    const user = result.rows[0];

    await createStarterAccounts(client, user.id, user.full_name);
    await client.query("COMMIT");

    return {
      token: signToken({ userId: user.id, email: user.email }),
      user: mapUser(user),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const result = await pool.query<UserWithPasswordRow>(
    `
      SELECT id, full_name, email, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const user = result.rows[0];

  if (!user || !verifyPassword(input.password, user.password_hash)) {
    throw new HttpError(401, "Invalid email or password.");
  }

  return {
    token: signToken({ userId: user.id, email: user.email }),
    user: mapUser(user),
  };
}
