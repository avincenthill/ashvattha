import { getDb } from "./connection.js";
import type { DbRow } from "./types.js";
import { AppError, ERROR_CODES } from "../errors.js";

export interface TreeNode {
  id: number;
  label: string;
  children: TreeNode[];
}

export interface GetAllTreesOptions {
  maxDepth?: number;
  limit?: number;
  offset?: number;
}

/**
 * Fetches nodes and builds the tree structure.
 * Roots have parent_id = NULL.
 * Uses idx_nodes_parent_id for efficient parent lookups.
 *
 * @param options.maxDepth - Max nesting depth (0 = roots only). Omit for no limit.
 * @param options.limit - Max number of roots to return. Omit for all.
 * @param options.offset - Number of roots to skip (for pagination).
 */
export function getAllTrees(options: GetAllTreesOptions = {}): TreeNode[] {
  const { maxDepth = Infinity, limit = Infinity, offset = 0 } = options;

  const database = getDb();
  const rows = database
    .prepare("SELECT id, label, parent_id FROM nodes ORDER BY id")
    .all() as DbRow[];

  const nodeMap = new Map<number, TreeNode>();
  const depthMap = new Map<number, number>();

  for (const row of rows) {
    nodeMap.set(row.id as number, {
      id: row.id as number,
      label: row.label as string,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const row of rows) {
    const node = nodeMap.get(row.id as number)!;
    if (row.parent_id === null) {
      depthMap.set(node.id, 0);
      roots.push(node);
    } else {
      const parent = nodeMap.get(row.parent_id as number);
      const parentDepth = parent ? depthMap.get(parent.id) ?? 0 : 0;
      if (parent && parentDepth < maxDepth) {
        const childDepth = parentDepth + 1;
        depthMap.set(node.id, childDepth);
        parent.children.push(node);
      } else if (!parent) {
        roots.push(node);
      }
    }
  }

  const paginatedRoots = roots.slice(offset, offset + limit);
  return paginatedRoots;
}

/**
 * Creates a new node and attaches it to the specified parent.
 * Uses a transaction so parent check and insert are atomic.
 * @param label - Node label
 * @param parentId - Parent node ID (null for root)
 * @returns The created node
 */
export function createNode(label: string, parentId: number | null): TreeNode {
  const database = getDb();

  return database.transaction((db) => {
    if (parentId !== null) {
      const parent = db.prepare("SELECT id FROM nodes WHERE id = ?").get(parentId);
      if (!parent) {
        const { status, message } = ERROR_CODES.PARENT_NOT_FOUND;
        throw new AppError(status, message, "PARENT_NOT_FOUND");
      }
    }

    const result = db
      .prepare("INSERT INTO nodes (label, parent_id) VALUES (?, ?)")
      .run(label, parentId);

    const id = result.lastInsertRowid;
    return { id, label, children: [] };
  });
}
