/**
 * Standalone script to initialize/reset the database.
 * Usage: npx ts-node src/scripts/init-db.ts
 * Or: npm run db:reset
 */
import path from "path";
import fs from "fs";
import { createDb } from "../db/drivers/index.js";
import { initSchema } from "../db/schema.js";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "trees.db");
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = createDb(dbPath);
initSchema(db);
db.close();

console.log("Database initialized at", dbPath);
