/**
 * Database driver selection.
 * Uses node:sqlite when running under Node.js, bun:sqlite when under Bun.
 */
import type { DbHandle } from "../types.js";

const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

export function createDb(path: string): DbHandle {
  if (isBun) {
    const { createBunSqliteDb } = require("./bun-sqlite.js");
    return createBunSqliteDb(path);
  }
  const { createNodeSqliteDb } = require("./node-sqlite.js");
  return createNodeSqliteDb(path);
}
