/**
 * Idempotency key storage using SQLite.
 * Keys expire after IDEMPOTENCY_TTL_MS (default 24h).
 */
import { getDb } from "./connection.js";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyEntry {
  status: number;
  body: unknown;
}

export function getIdempotencyEntry(key: string): IdempotencyEntry | null {
  const db = getDb();
  const row = db.prepare("SELECT status, body, created_at FROM idempotency_keys WHERE key = ?").get(key) as
    | { status: number; body: string; created_at: number }
    | undefined;

  if (!row) return null;

  const age = Date.now() - row.created_at;
  if (age > IDEMPOTENCY_TTL_MS) {
    db.prepare("DELETE FROM idempotency_keys WHERE key = ?").run(key);
    return null;
  }

  return { status: row.status, body: JSON.parse(row.body) };
}

export function setIdempotencyEntry(key: string, status: number, body: unknown): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO idempotency_keys (key, status, body, created_at) VALUES (?, ?, ?, ?)"
  ).run(key, status, JSON.stringify(body), Date.now());
}
