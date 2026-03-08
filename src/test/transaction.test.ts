/**
 * Tests for DB transaction support.
 */
import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import { getDb, closeDb } from "../db/connection.js";

describe("DB transactions", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
  });

  after(closeDb);

  it("commits on success", () => {
    const db = getDb();
    const result = db.transaction((tx) => {
      return tx.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("a", null);
    });
    assert.strictEqual(result.lastInsertRowid, 1);

    const row = db.prepare("SELECT id, label FROM nodes WHERE id = 1").get() as { id: number; label: string };
    assert.strictEqual(row.id, 1);
    assert.strictEqual(row.label, "a");
  });

  it("rolls back on throw", () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("existing", null);

    assert.throws(
      () =>
        db.transaction((tx) => {
          tx.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("new", null);
          throw new Error("abort");
        }),
      { message: "abort" }
    );

    const rows = db.prepare("SELECT id, label FROM nodes ORDER BY id").all();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual((rows[0] as { label: string }).label, "existing");
  });
});
