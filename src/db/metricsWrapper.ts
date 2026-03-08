/**
 * Wraps a DbHandle to record metrics for all prepare().all/get/run calls.
 */
import type { DbHandle, PreparedStatement } from "./types.js";
import { dbMetrics } from "../metrics/index.js";

function instrument<T>(op: "all" | "get" | "run", fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    dbMetrics.recordQuery(op, performance.now() - start, false);
    return result;
  } catch (err) {
    dbMetrics.recordQuery(op, performance.now() - start, true);
    throw err;
  }
}

/**
 * Wraps a DbHandle to record query counts, durations, and errors.
 * exec() and close() are not instrumented.
 */
export function wrapDbWithMetrics(db: DbHandle): DbHandle {
  const wrapped: DbHandle = {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        all(...params: unknown[]) {
          return instrument("all", () => stmt.all(...params));
        },
        get(...params: unknown[]) {
          return instrument("get", () => stmt.get(...params));
        },
        run(...params: unknown[]) {
          return instrument("run", () => stmt.run(...params));
        },
      };
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
