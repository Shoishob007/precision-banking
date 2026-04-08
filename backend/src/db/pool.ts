import { types, Pool } from "pg";
import { env } from "../config/env.js";

types.setTypeParser(1700, (value: string) => Number(value));

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: {
    rejectUnauthorized: false,
  },
});
