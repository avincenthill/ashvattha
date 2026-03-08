/**
 * Tests for request idempotency.
 */
import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { treeRouter } from "../routes/tree.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { getDb, closeDb } from "../db/connection.js";

const app = express();
app.use(express.json());
app.use("/api/v1/tree", treeRouter);
app.use(errorHandler);

describe("Idempotency", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
    db.prepare("DELETE FROM idempotency_keys").run();
  });

  after(closeDb);

  it("returns stored response on duplicate key", async () => {
    const key = "test-key-123";
    const res1 = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", key)
      .send({ label: "root" });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.body.id, 1);
    assert.strictEqual(res1.body.label, "root");

    const res2 = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", key)
      .send({ label: "root" });
    assert.strictEqual(res2.status, 201);
    assert.deepStrictEqual(res2.body, res1.body);

    const trees = await request(app).get("/api/v1/tree");
    assert.strictEqual(trees.body.length, 1);
  });

  it("processes normally without key", async () => {
    const res = await request(app).post("/api/v1/tree").send({ label: "root" });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.label, "root");
  });

  it("ignores invalid key format", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", "invalid key!")
      .send({ label: "root" });
    assert.strictEqual(res.status, 201);
  });

  it("returns stored response when same key used with different body", async () => {
    const key = "key-diff-body";
    const res1 = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", key)
      .send({ label: "first" });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.body.label, "first");

    const res2 = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", key)
      .send({ label: "second" });
    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.label, "first");
    assert.deepStrictEqual(res2.body, res1.body);
  });

  it("treats empty idempotency key as no key", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .set("Idempotency-Key", "")
      .send({ label: "root" });
    assert.strictEqual(res.status, 201);
  });
});
