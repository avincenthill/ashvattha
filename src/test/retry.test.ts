/**
 * Tests for DB retry logic.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { wrapDbWithRetry } from "../db/retry.js";
import type { DbHandle, DbRow, RunResult } from "../db/types.js";

function createFlakyDb(failCount: { current: number }, maxFails: number): DbHandle {
  const throwUntilExhausted = () => {
    if (failCount.current < maxFails) {
      failCount.current++;
      throw new Error("SQLITE_BUSY: database is locked");
    }
  };

  const handle: DbHandle = {
    exec() {},
    prepare() {
      return {
        all(...params: unknown[]) {
          throwUntilExhausted();
          return [] as DbRow[];
        },
        get(...params: unknown[]) {
          throwUntilExhausted();
          return { id: 1 } as DbRow;
        },
        run(...params: unknown[]) {
          throwUntilExhausted();
          return { lastInsertRowid: 1, changes: 1 } satisfies RunResult;
        },
      };
    },
    close() {},
    transaction<T>(fn: (db: DbHandle) => T): T {
      return fn(handle);
    },
  };
  return handle;
}

describe("DB retry", () => {
  it("succeeds after one transient failure (all)", () => {
    const failCount = { current: 0 };
    const db = wrapDbWithRetry(createFlakyDb(failCount, 1));
    const rows = db.prepare("SELECT 1").all();
    assert.deepStrictEqual(rows, []);
    assert.strictEqual(failCount.current, 1);
  });

  it("succeeds after two transient failures (get)", () => {
    const failCount = { current: 0 };
    const db = wrapDbWithRetry(createFlakyDb(failCount, 2));
    const row = db.prepare("SELECT id FROM nodes WHERE id = ?").get(1);
    assert.deepStrictEqual(row, { id: 1 });
    assert.strictEqual(failCount.current, 2);
  });

  it("succeeds after two transient failures (run)", () => {
    const failCount = { current: 0 };
    const db = wrapDbWithRetry(createFlakyDb(failCount, 2));
    const result = db.prepare("INSERT INTO nodes (label) VALUES (?)").run("x");
    assert.strictEqual(result.lastInsertRowid, 1);
    assert.strictEqual(result.changes, 1);
    assert.strictEqual(failCount.current, 2);
  });

  it("throws after three failures (exhausts retries)", () => {
    const failCount = { current: 0 };
    const db = wrapDbWithRetry(createFlakyDb(failCount, 3));
    assert.throws(
      () => db.prepare("SELECT 1").all(),
      { message: "SQLITE_BUSY: database is locked" }
    );
    assert.strictEqual(failCount.current, 3);
  });

  it("succeeds on first attempt when no failure", () => {
    const failCount = { current: 0 };
    const db = wrapDbWithRetry(createFlakyDb(failCount, 0));
    const rows = db.prepare("SELECT 1").all();
    assert.deepStrictEqual(rows, []);
    assert.strictEqual(failCount.current, 0);
  });
});
