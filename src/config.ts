/**
 * Application configuration.
 * In production, these would typically come from environment variables.
 */
export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  dbPath: process.env.DB_PATH ?? './data/trees.db',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Request timeout in milliseconds. Requests exceeding this receive 408. */
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS ?? '30000', 10),
} as const;
