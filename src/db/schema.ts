import type { DbHandle } from "./types.js";
import { logger } from "../logger.js";

/**
 * Creates the nodes table if it doesn't exist.
 * Uses adjacency list: each node has parent_id (NULL for roots).
 */
export function initSchema(db: DbHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      status INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  logger.info("Database schema initialized");
}
