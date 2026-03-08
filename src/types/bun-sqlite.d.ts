/**
 * Type declarations for bun:sqlite (Bun runtime only).
 * @see https://bun.sh/reference/bun/sqlite
 */
declare module "bun:sqlite" {
  export class Database {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      all(...args: unknown[]): unknown[];
      get(...args: unknown[]): unknown;
      run(...args: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    };
    close(): void;
  }
}
