/**
 * Node.js built-in SQLite driver.
 * @see https://nodejs.org/api/sqlite.html
 */
import { DatabaseSync } from "node:sqlite";
import type { DbHandle, PreparedStatement, RunResult } from "../types.js";

function toNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

type SqlParam = string | number | bigint | null | Buffer | Uint8Array;

function wrapStatement(stmt: ReturnType<DatabaseSync["prepare"]>): PreparedStatement {
  return {
    all(...params: unknown[]) {
      return stmt.all(...(params as SqlParam[])) as import("../types.js").DbRow[];
    },
    get(...params: unknown[]) {
      return stmt.get(...(params as SqlParam[])) as Record<string, unknown> | undefined;
    },
    run(...params: unknown[]) {
      const result = stmt.run(...(params as SqlParam[]));
      return {
        lastInsertRowid: toNumber(result.lastInsertRowid),
        changes: toNumber(result.changes),
      } satisfies RunResult;
    },
  };
}

export function createNodeSqliteDb(path: string): DbHandle {
  const db = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
  });

  // WAL mode improves write concurrency
  db.exec("PRAGMA journal_mode = WAL");

  const handle: DbHandle = {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      return wrapStatement(db.prepare(sql));
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
