/**
 * Tests for database schema (indexes, etc.).
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { getDb, closeDb } from "../db/connection.js";

describe("Schema", () => {
  after(closeDb);

  it("has index on parent_id for efficient tree queries", () => {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='nodes' AND name='idx_nodes_parent_id'"
      )
      .all() as { name: string }[];
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].name, "idx_nodes_parent_id");
  });
});
