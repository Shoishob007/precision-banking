import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

async function main() {
  const schema = await readFile(join(currentDir, "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("Database schema created successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to initialize database schema.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
