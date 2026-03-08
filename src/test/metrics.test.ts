/**
 * Tests for metrics layer.
 */
import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import express from "express";
import { treeRouter } from "../routes/tree.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { getDb, closeDb } from "../db/connection.js";
import { dbMetrics } from "../metrics/index.js";
import { createTestClient } from "./helpers.js";

const app = express();
app.use(express.json());
app.use("/api/v1/tree", treeRouter);
app.get("/metrics", (_req, res) => {
  res.json(dbMetrics.getSnapshot());
});
app.use(errorHandler);

describe("Metrics", () => {
  const client = createTestClient(app);

  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
  });

  after(() => {
    client.close();
    closeDb();
  });

  it("returns metrics with expected shape", async () => {
    const res = await client.get("/metrics");
    assert.strictEqual(res.status, 200);
    const body = res.body as { queries: { all: number; get: number; run: number }; errors: number; totalDurationMs: number };
    assert.ok(typeof body.queries.all === "number");
    assert.ok(typeof body.queries.get === "number");
    assert.ok(typeof body.queries.run === "number");
    assert.ok(typeof body.errors === "number");
    assert.ok(typeof body.totalDurationMs === "number");
  });

  it("increments metrics on GET /api/v1/tree", async () => {
    const beforeRes = await client.get("/metrics");
    const before = (beforeRes.body as { queries: { all: number } }).queries.all;
    await client.get("/api/v1/tree");
    const afterRes = await client.get("/metrics");
    const after = (afterRes.body as { queries: { all: number } }).queries.all;
    assert.ok(after > before, `expected all queries to increase (${before} -> ${after})`);
  });

  it("increments run metrics on POST", async () => {
    const beforeRes = await client.get("/metrics");
    const before = (beforeRes.body as { queries: { run: number } }).queries.run;
    await client.post("/api/v1/tree", { label: "root" });
    const afterRes = await client.get("/metrics");
    const after = (afterRes.body as { queries: { run: number } }).queries.run;
    assert.ok(after > before, `expected run queries to increase (${before} -> ${after})`);
  });
});
