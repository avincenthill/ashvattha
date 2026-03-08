/**
 * Retry wrapper for database operations.
 * Retries failed calls up to maxRetries times (maxRetries=2 → 3 total attempts).
 */
import type { DbHandle, PreparedStatement, DbRow, RunResult } from "./types.js";
import { logger } from "../logger.js";

const DEFAULT_MAX_RETRIES = 2;

function withRetry<T>(fn: () => T, maxRetries: number): T {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        logger.warn("Database operation failed, retrying", {
          attempt: attempt + 1,
          maxRetries,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  throw lastError;
}

function wrapStatement(stmt: PreparedStatement, maxRetries: number): PreparedStatement {
  return {
    all(...params: unknown[]) {
      return withRetry(() => stmt.all(...params), maxRetries);
    },
    get(...params: unknown[]) {
      return withRetry(() => stmt.get(...params), maxRetries);
    },
    run(...params: unknown[]) {
      return withRetry(() => stmt.run(...params), maxRetries);
    },
  };
}

/**
 * Wraps a DbHandle so that prepare().all(), .get(), and .run() are retried
 * on failure. exec() is not retried (schema/init); close() is not retried.
 */
export function wrapDbWithRetry(db: DbHandle, maxRetries = DEFAULT_MAX_RETRIES): DbHandle {
  const wrapped: DbHandle = {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      return wrapStatement(db.prepare(sql), maxRetries);
    },
    close() {
      db.close();
    },
    transaction<T>(fn: (db: DbHandle) => T): T {
      return db.transaction(() => fn(wrapped));
    },
  };
  return wrapped;
}
