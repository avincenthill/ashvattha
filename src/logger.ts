/**
 * Application logger. Re-exports from the logging layer.
 * To swap Winston for pino/bunyan/console: change createLogger() in src/logging/index.ts
 */
export { logger } from './logging/index.js';
