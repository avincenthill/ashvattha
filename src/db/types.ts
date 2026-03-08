/**
 * Database abstraction layer.
 * Implement this interface to swap SQLite for Postgres or another DB.
 * @see https://nodejs.org/api/sqlite.html
 */

export interface DbRow {
  [key: string]: unknown;
}

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface PreparedStatement {
  all(...params: unknown[]): DbRow[];
  get(...params: unknown[]): DbRow | undefined;
  run(...params: unknown[]): RunResult;
}

export interface DbHandle {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
  /** Run fn inside a transaction. Commits on success, rolls back on throw. */
  transaction<T>(fn: (db: DbHandle) => T): T;
}
