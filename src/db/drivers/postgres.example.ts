/**
 * Example Postgres driver stub.
 * To swap from SQLite to Postgres:
 * 1. Implement this file using pg or postgres.js
 * 2. In connection.ts, replace: import { createNodeSqliteDb } from "./drivers/node-sqlite.js"
 *    with: import { createPostgresDb } from "./drivers/postgres.js"
 * 3. Update getDb() to use createPostgresDb(config.dbUrl)
 *
 * The DbHandle interface in types.ts ensures repository and schema need no changes.
 */
import type { DbHandle } from "../types.js";
import { AppError, ERROR_CODES } from "../../errors.js";

export function createPostgresDb(_connectionString: string): DbHandle {
  const { status, message } = ERROR_CODES.INTERNAL_ERROR;
  throw new AppError(status, "Postgres driver not implemented. See types.ts for DbHandle interface.", "INTERNAL_ERROR");
}
