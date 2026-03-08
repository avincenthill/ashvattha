/**
 * In-memory mock metrics. Use for development or swap for Prometheus/StatsD in production.
 */
import type { DbMetrics, DbMetricsSnapshot, DbOperation } from "../types.js";

export function createMockDbMetrics(): DbMetrics {
  const queries = { all: 0, get: 0, run: 0 };
  let errors = 0;
  let totalDurationMs = 0;

  return {
    recordQuery(op: DbOperation, durationMs?: number, error?: boolean) {
      queries[op]++;
      if (error) errors++;
      if (typeof durationMs === "number") totalDurationMs += durationMs;
    },
    getSnapshot(): DbMetricsSnapshot {
      return {
        queries: { ...queries },
        errors,
        totalDurationMs,
      };
    },
  };
}
