/**
 * Tree API tests using node:test.
 * @see https://nodejs.org/api/test.html
 * Run with: DB_PATH=:memory: NODE_ENV=test node --test
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

describe("Tree API", () => {
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

  describe("GET /api/v1/tree", () => {
    it("returns empty array when no nodes exist", async () => {
      const res = await client.get("/api/v1/tree");
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, []);
    });

    it("returns trees in nested structure", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("bear", 1);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("cat", 2);

      const res = await client.get("/api/v1/tree");
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body as unknown[]).length, 1);
      interface TreeNode {
        id: number;
        label: string;
        children: TreeNode[];
      }
      const tree = (res.body as TreeNode[])[0];
      assert.strictEqual(tree.id, 1);
      assert.strictEqual(tree.label, "root");
      assert.strictEqual(tree.children.length, 1);
      assert.strictEqual(tree.children[0].id, 2);
      assert.strictEqual(tree.children[0].label, "bear");
      assert.strictEqual(tree.children[0].children.length, 1);
      const cat = tree.children[0].children[0];
      assert.strictEqual(cat.id, 3);
      assert.strictEqual(cat.label, "cat");
      assert.deepStrictEqual(cat.children, []);
    });

    it("returns multiple roots when applicable", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root1", null);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root2", null);

      const res = await client.get("/api/v1/tree");
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body as unknown[]).length, 2);
      assert.strictEqual((res.body as { label: string }[])[0].label, "root1");
      assert.strictEqual((res.body as { label: string }[])[1].label, "root2");
    });

    it("limits depth with maxDepth query param", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("a", 1);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("b", 2);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("c", 3);

      const res = await client.get("/api/v1/tree?maxDepth=2");
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body as unknown[]).length, 1);
      const tree = (res.body as { children: unknown[] }[])[0];
      assert.strictEqual(tree.children.length, 1);
      assert.strictEqual((tree.children[0] as { children: unknown[] }).children.length, 1);
      assert.strictEqual((tree.children[0] as { children: { children: unknown[] }[] }).children[0].children.length, 0);
    });

    it("maxDepth=0 returns roots only", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("child", 1);

      const res = await client.get("/api/v1/tree?maxDepth=0");
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body as unknown[]).length, 1);
      assert.strictEqual((res.body as { children: unknown[] }[])[0].children.length, 0);
    });

    it("paginates roots with limit and offset", async () => {
      const db = getDb();
      for (let i = 1; i <= 5; i++) {
        db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run(`root${i}`, null);
      }

      const res1 = await client.get("/api/v1/tree?limit=2&offset=0");
      assert.strictEqual(res1.status, 200);
      assert.strictEqual((res1.body as unknown[]).length, 2);
      assert.strictEqual((res1.body as { label: string }[])[0].label, "root1");
      assert.strictEqual((res1.body as { label: string }[])[1].label, "root2");

      const res2 = await client.get("/api/v1/tree?limit=2&offset=2");
      assert.strictEqual(res2.status, 200);
      assert.strictEqual((res2.body as unknown[]).length, 2);
      assert.strictEqual((res2.body as { label: string }[])[0].label, "root3");
      assert.strictEqual((res2.body as { label: string }[])[1].label, "root4");
    });

    it("returns 400 for invalid maxDepth", async () => {
      const res = await client.get("/api/v1/tree?maxDepth=-1");
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 for invalid limit", async () => {
      const res = await client.get("/api/v1/tree?limit=0");
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });
  });

  describe("POST /api/v1/tree", () => {
    it("creates a root node when parentId is omitted", async () => {
      const res = await client.post("/api/v1/tree", { label: "root" });
      assert.strictEqual(res.status, 201);
      assert.strictEqual((res.body as { id: number }).id, 1);
      assert.strictEqual((res.body as { label: string }).label, "root");
      assert.deepStrictEqual((res.body as { children: unknown[] }).children, []);

      const getRes = await client.get("/api/v1/tree");
      assert.strictEqual((getRes.body as unknown[]).length, 1);
      assert.strictEqual((getRes.body as { label: string }[])[0].label, "root");
    });

    it("creates a root node when parentId is null", async () => {
      const res = await client.post("/api/v1/tree", { label: "root", parentId: null });
      assert.strictEqual(res.status, 201);
      assert.strictEqual((res.body as { label: string }).label, "root");
    });

    it("creates a child node when parentId is provided", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);

      const res = await client.post("/api/v1/tree", { label: "bear", parentId: 1 });
      assert.strictEqual(res.status, 201);
      assert.strictEqual((res.body as { id: number }).id, 2);
      assert.strictEqual((res.body as { label: string }).label, "bear");
      assert.deepStrictEqual((res.body as { children: unknown[] }).children, []);

      const getRes = await client.get("/api/v1/tree");
      assert.strictEqual((getRes.body as { children: unknown[] }[])[0].children.length, 1);
      assert.strictEqual((getRes.body as { children: { label: string }[] }[])[0].children[0].label, "bear");
    });

    it("accepts parent_id (snake_case)", async () => {
      const db = getDb();
      db.prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)").run("root", null);

      const res = await client.post("/api/v1/tree", { label: "child", parent_id: 1 });
      assert.strictEqual(res.status, 201);
      assert.strictEqual((res.body as { label: string }).label, "child");
    });

    it("returns 404 when parent does not exist with consistent error shape", async () => {
      const res = await client.post("/api/v1/tree", { label: "orphan", parentId: 999 });
      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, {
        error: { code: "PARENT_NOT_FOUND", message: "Parent node does not exist" },
      });
    });

    it("returns 400 when label is missing with consistent error shape", async () => {
      const res = await client.post("/api/v1/tree", {});
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
      assert.strictEqual((res.body as { error: { message: string } }).error.message, "Validation failed");
      assert.ok(Array.isArray((res.body as { error: { details: unknown[] } }).error.details));
    });

    it("returns 400 when label is empty string", async () => {
      const res = await client.post("/api/v1/tree", { label: "" });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when label exceeds max length", async () => {
      const res = await client.post("/api/v1/tree", { label: "x".repeat(501) });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when parentId is invalid type", async () => {
      const res = await client.post("/api/v1/tree", { label: "node", parentId: "not-a-number" });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("accepts label at max length (500 chars)", async () => {
      const label = "x".repeat(500);
      const res = await client.post("/api/v1/tree", { label });
      assert.strictEqual(res.status, 201);
      assert.strictEqual((res.body as { label: string }).label, label);
    });

    it("returns 400 when parentId is negative", async () => {
      const res = await client.post("/api/v1/tree", { label: "node", parentId: -1 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when parentId is zero", async () => {
      const res = await client.post("/api/v1/tree", { label: "node", parentId: 0 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when parent_id is invalid type", async () => {
      const res = await client.post("/api/v1/tree", { label: "node", parent_id: "bad" });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when label is a number", async () => {
      const res = await client.post("/api/v1/tree", { label: 123 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when label is null", async () => {
      const res = await client.post("/api/v1/tree", { label: null });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 400 when label is an array", async () => {
      const res = await client.post("/api/v1/tree", { label: ["a", "b"] });
      assert.strictEqual(res.status, 400);
      assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_FAILED");
    });

    it("returns 4xx or 5xx for invalid JSON body", async () => {
      const res = await client.post("/api/v1/tree", "not valid json", { "Content-Type": "application/json" });
      assert.ok(res.status >= 400, `expected error status, got ${res.status}`);
    });
  });
});
