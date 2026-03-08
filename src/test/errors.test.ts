/**
 * Tests for error handling and edge cases.
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
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1/tree", treeRouter);
app.use(errorHandler);

describe("Error handling", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
    db.prepare("DELETE FROM idempotency_keys").run();
  });

  after(closeDb);

  it("returns 404 for unknown route", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    assert.strictEqual(res.status, 404);
  });

  it("returns 404 for POST to unknown path", async () => {
    const res = await request(app)
      .post("/api/v1/missing")
      .send({ label: "x" });
    assert.strictEqual(res.status, 404);
  });

  it("handles GET without body", async () => {
    const res = await request(app).get("/api/v1/tree");
    assert.strictEqual(res.status, 200);
  });

  it("validation error includes details with path and message", async () => {
    const res = await request(app).post("/api/v1/tree").send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
    assert.ok(Array.isArray(res.body.error.details));
    const labelDetail = res.body.error.details.find((d: { path: string }) => d.path === "label");
    assert.ok(labelDetail);
    assert.ok(typeof labelDetail.message === "string");
  });

  it("PARENT_NOT_FOUND has no details field", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "x", parentId: 999 });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, "PARENT_NOT_FOUND");
    assert.strictEqual(res.body.error.message, "Parent node does not exist");
    assert.strictEqual(res.body.error.details, undefined);
  });
});
