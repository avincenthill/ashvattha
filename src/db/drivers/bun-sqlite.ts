/**
 * Bun built-in SQLite driver.
 * Used when running under Bun (e.g. `bun test`).
 * @see https://bun.sh/reference/bun/sqlite
 */
import { Database } from "bun:sqlite";
import type { DbHandle, PreparedStatement, RunResult } from "../types.js";

function toNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export function createBunSqliteDb(path: string): DbHandle {
  const db = new Database(path);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  const handle: DbHandle = {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string): PreparedStatement {
      const stmt = db.prepare(sql);
      return {
        all(...params: unknown[]) {
          return stmt.all(...params) as import("../types.js").DbRow[];
        },
        get(...params: unknown[]) {
          return stmt.get(...params) as Record<string, unknown> | undefined;
        },
        run(...params: unknown[]) {
          const result = stmt.run(...params);
          return {
            lastInsertRowid: toNumber(result.lastInsertRowid),
            changes: toNumber(result.changes),
          } satisfies RunResult;
        },
      };
    },
    close() {
      db.close();
    },
    transaction<T>(fn: (db: DbHandle) => T): T {
      db.exec("BEGIN");
      try {
        const result = fn(handle);
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return handle;
}
