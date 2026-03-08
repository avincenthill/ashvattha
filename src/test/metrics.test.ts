/**
 * Tests for metrics layer.
 */
import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { treeRouter } from "../routes/tree.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { getDb, closeDb } from "../db/connection.js";
import { dbMetrics } from "../metrics/index.js";

const app = express();
app.use(express.json());
app.use("/api/v1/tree", treeRouter);
app.get("/metrics", (_req, res) => {
  res.json(dbMetrics.getSnapshot());
});
app.use(errorHandler);

describe("Metrics", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
  });

  after(closeDb);

  it("returns metrics with expected shape", async () => {
    const res = await request(app).get("/metrics");
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.queries.all === "number");
    assert.ok(typeof res.body.queries.get === "number");
    assert.ok(typeof res.body.queries.run === "number");
    assert.ok(typeof res.body.errors === "number");
    assert.ok(typeof res.body.totalDurationMs === "number");
  });

  it("increments metrics on GET /api/v1/tree", async () => {
    const before = (await request(app).get("/metrics")).body.queries.all;
    await request(app).get("/api/v1/tree");
    const after = (await request(app).get("/metrics")).body.queries.all;
    assert.ok(after > before, `expected all queries to increase (${before} -> ${after})`);
  });

  it("increments run metrics on POST", async () => {
    const before = (await request(app).get("/metrics")).body.queries.run;
    await request(app).post("/api/v1/tree").send({ label: "root" });
    const after = (await request(app).get("/metrics")).body.queries.run;
    assert.ok(after > before, `expected run queries to increase (${before} -> ${after})`);
  });
});
