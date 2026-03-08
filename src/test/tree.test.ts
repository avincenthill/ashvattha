/**
 * Tree API tests using node:test.
 * @see https://nodejs.org/api/test.html
 * Run with: DB_PATH=:memory: NODE_ENV=test node --test
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

describe("Tree API", () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM nodes").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='nodes'").run();
  });

  after(closeDb);

  describe("GET /api/v1/tree", () => {

  it("returns empty array when no nodes exist", async () => {
    const res = await request(app).get("/api/v1/tree");
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, []);
  });

  it("returns trees in nested structure", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("bear", 1);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("cat", 2);

    const res = await request(app).get("/api/v1/tree");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].id, 1);
    assert.strictEqual(res.body[0].label, "root");
    assert.strictEqual(res.body[0].children.length, 1);
    assert.strictEqual(res.body[0].children[0].id, 2);
    assert.strictEqual(res.body[0].children[0].label, "bear");
    assert.strictEqual(res.body[0].children[0].children.length, 1);
    assert.strictEqual(res.body[0].children[0].children[0].id, 3);
    assert.strictEqual(res.body[0].children[0].children[0].label, "cat");
    assert.deepStrictEqual(res.body[0].children[0].children[0].children, []);
  });

  it("returns multiple roots when applicable", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root1", null);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root2", null);

    const res = await request(app).get("/api/v1/tree");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
    assert.strictEqual(res.body[0].label, "root1");
    assert.strictEqual(res.body[1].label, "root2");
  });

  it("limits depth with maxDepth query param", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("a", 1);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("b", 2);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("c", 3);

    const res = await request(app).get("/api/v1/tree?maxDepth=2");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].children.length, 1);
    assert.strictEqual(res.body[0].children[0].children.length, 1);
    assert.strictEqual(res.body[0].children[0].children[0].children.length, 0);
  });

  it("maxDepth=0 returns roots only", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("child", 1);

    const res = await request(app).get("/api/v1/tree?maxDepth=0");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].children.length, 0);
  });

  it("paginates roots with limit and offset", async () => {
    const db = getDb();
    for (let i = 1; i <= 5; i++) {
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run(`root${i}`, null);
    }

    const res1 = await request(app).get("/api/v1/tree?limit=2&offset=0");
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.length, 2);
    assert.strictEqual(res1.body[0].label, "root1");
    assert.strictEqual(res1.body[1].label, "root2");

    const res2 = await request(app).get("/api/v1/tree?limit=2&offset=2");
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.length, 2);
    assert.strictEqual(res2.body[0].label, "root3");
    assert.strictEqual(res2.body[1].label, "root4");
  });

  it("returns 400 for invalid maxDepth", async () => {
    const res = await request(app).get("/api/v1/tree?maxDepth=-1");
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 for invalid limit", async () => {
    const res = await request(app).get("/api/v1/tree?limit=0");
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });
  });

  describe("POST /api/v1/tree", () => {

  it("creates a root node when parentId is omitted", async () => {
    const res = await request(app).post("/api/v1/tree").send({ label: "root" });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.id, 1);
    assert.strictEqual(res.body.label, "root");
    assert.deepStrictEqual(res.body.children, []);

    const getRes = await request(app).get("/api/v1/tree");
    assert.strictEqual(getRes.body.length, 1);
    assert.strictEqual(getRes.body[0].label, "root");
  });

  it("creates a root node when parentId is null", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "root", parentId: null });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.label, "root");
  });

  it("creates a child node when parentId is provided", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);

    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "bear", parentId: 1 });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.id, 2);
    assert.strictEqual(res.body.label, "bear");
    assert.deepStrictEqual(res.body.children, []);

    const getRes = await request(app).get("/api/v1/tree");
    assert.strictEqual(getRes.body[0].children.length, 1);
    assert.strictEqual(getRes.body[0].children[0].label, "bear");
  });

  it("accepts parent_id (snake_case)", async () => {
    const db = getDb();
    db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);

    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "child", parent_id: 1 });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.label, "child");
  });

  it("returns 404 when parent does not exist with consistent error shape", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "orphan", parentId: 999 });
    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(res.body, {
      error: { code: "PARENT_NOT_FOUND", message: "Parent node does not exist" },
    });
  });

  it("returns 400 when label is missing with consistent error shape", async () => {
    const res = await request(app).post("/api/v1/tree").send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
    assert.strictEqual(res.body.error.message, "Validation failed");
    assert.ok(Array.isArray(res.body.error.details));
  });

  it("returns 400 when label is empty string", async () => {
    const res = await request(app).post("/api/v1/tree").send({ label: "" });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when label exceeds max length", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "x".repeat(501) });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when parentId is invalid type", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "node", parentId: "not-a-number" });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("accepts label at max length (500 chars)", async () => {
    const label = "x".repeat(500);
    const res = await request(app).post("/api/v1/tree").send({ label });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.label, label);
  });

  it("returns 400 when parentId is negative", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "node", parentId: -1 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when parentId is zero", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "node", parentId: 0 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when parent_id is invalid type", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: "node", parent_id: "bad" });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when label is a number", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: 123 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when label is null", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: null });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 400 when label is an array", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .send({ label: ["a", "b"] });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION_FAILED");
  });

  it("returns 4xx or 5xx for invalid JSON body", async () => {
    const res = await request(app)
      .post("/api/v1/tree")
      .set("Content-Type", "application/json")
      .send("not valid json");
    assert.ok(res.status >= 400, `expected error status, got ${res.status}`);
  });
  });
});
