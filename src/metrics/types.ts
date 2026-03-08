/**
 * Metrics abstraction for DB usage.
 * Implement this interface to swap the mock for Prometheus, StatsD, etc.
 */

export type DbOperation = "all" | "get" | "run";

export interface DbMetricsSnapshot {
  queries: { all: number; get: number; run: number };
  errors: number;
  totalDurationMs: number;
}

export interface DbMetrics {
  /** Record a DB query. Call after each all/get/run. */
  recordQuery(op: DbOperation, durationMs?: number, error?: boolean): void;
  /** Return current counters. Resets depend on implementation. */
  getSnapshot(): DbMetricsSnapshot;
}
