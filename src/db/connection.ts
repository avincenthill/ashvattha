import path from "path";
import fs from "fs";
import { config } from "../config.js";
import { initSchema } from "./schema.js";
import { logger } from "../logger.js";
import { createDb } from "./drivers/index.js";
import { wrapDbWithRetry } from "./retry.js";
import { wrapDbWithMetrics } from "./metricsWrapper.js";
import type { DbHandle } from "./types.js";

let db: DbHandle | null = null;

/**
 * Ensures the data directory exists and returns a singleton DB connection.
 * Uses node:sqlite under Node.js, bun:sqlite under Bun.
 * All prepare().all/get/run calls are retried twice on failure (3 total attempts)
 * and instrumented for metrics (query counts, duration, errors).
 */
export function getDb(): DbHandle {
  if (db) return db;

  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info("Created data directory", { path: dir });
  }

  db = wrapDbWithRetry(wrapDbWithMetrics(createDb(config.dbPath)));
  initSchema(db);
  return db;
}

/**
 * Closes the database connection. Used for graceful shutdown and tests.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info("Database connection closed");
  }
}
