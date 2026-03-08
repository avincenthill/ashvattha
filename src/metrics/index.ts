/**
 * Metrics layer. Swap adapters in createDbMetrics() to use Prometheus, StatsD, etc.
 */
import type { DbMetrics } from "./types.js";
import { createMockDbMetrics } from "./adapters/mock.js";

export type { DbMetrics, DbMetricsSnapshot, DbOperation } from "./types.js";

export function createDbMetrics(): DbMetrics {
  return createMockDbMetrics();
}

export const dbMetrics = createDbMetrics();
