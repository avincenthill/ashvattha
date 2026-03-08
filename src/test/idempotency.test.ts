/**
 * Tests for request idempotency.
 */
import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import express from "express";
import { treeRouter } from "../routes/tree.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { getDb, closeDb } from "../db/connection.js";
import { createTestClient } from "./helpers.js";

const app = express();
app.use(express.json());
app.use("/api/v1/tree", treeRouter);
app.use(errorHandler);

describe("Idempotency", () => {
  const client = createTestClient(app);

  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
    db.prepare("DELETE FROM idempotency_keys").run();
  });

  after(() => {
    client.close();
    closeDb();
  });

  it("returns stored response on duplicate key", async () => {
    const key = "test-key-123";
    const res1 = await client.post("/api/v1/tree", { label: "root" }, { "Idempotency-Key": key });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual((res1.body as { id: number }).id, 1);
    assert.strictEqual((res1.body as { label: string }).label, "root");

    const res2 = await client.post("/api/v1/tree", { label: "root" }, { "Idempotency-Key": key });
    assert.strictEqual(res2.status, 201);
    assert.deepStrictEqual(res2.body, res1.body);

    const trees = await client.get("/api/v1/tree");
    assert.strictEqual((trees.body as unknown[]).length, 1);
  });

  it("processes normally without key", async () => {
    const res = await client.post("/api/v1/tree", { label: "root" });
    assert.strictEqual(res.status, 201);
    assert.strictEqual((res.body as { label: string }).label, "root");
  });

  it("ignores invalid key format", async () => {
    const res = await client.post("/api/v1/tree", { label: "root" }, { "Idempotency-Key": "invalid key!" });
    assert.strictEqual(res.status, 201);
  });

  it("returns stored response when same key used with different body", async () => {
    const key = "key-diff-body";
    const res1 = await client.post("/api/v1/tree", { label: "first" }, { "Idempotency-Key": key });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual((res1.body as { label: string }).label, "first");

    const res2 = await client.post("/api/v1/tree", { label: "second" }, { "Idempotency-Key": key });
    assert.strictEqual(res2.status, 201);
    assert.strictEqual((res2.body as { label: string }).label, "first");
    assert.deepStrictEqual(res2.body, res1.body);
  });

  it("treats empty idempotency key as no key", async () => {
    const res = await client.post("/api/v1/tree", { label: "root" }, { "Idempotency-Key": "" });
    assert.strictEqual(res.status, 201);
  });
});
