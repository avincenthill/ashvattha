/**
 * Logging layer. Swap adapters in createLogger() to use pino, bunyan, etc.
 */
import type { Logger } from './types.js';
import { createWinstonLogger } from './adapters/winston.js';

export type { Logger } from './types.js';

export function createLogger(): Logger {
  return createWinstonLogger();
}

export const logger = createLogger();
