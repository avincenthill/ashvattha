/**
 * Example console adapter. To use instead of Winston:
 * 1. In src/logging/index.ts, replace: import { createWinstonLogger } from './adapters/winston.js'
 *    with: import { createConsoleLogger } from './adapters/console.js'
 * 2. Change createLogger() to return createConsoleLogger()
 * 3. Remove winston from package.json
 */
import type { Logger } from '../types.js';

export function createConsoleLogger(): Logger {
  const prefix = (level: string) => `[${level}]`;
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (process.env.NODE_ENV !== 'test') {
        console.debug(prefix('DEBUG'), message, meta ?? '');
      }
    },
    info(message: string, meta?: Record<string, unknown>) {
      console.info(prefix('INFO'), message, meta ?? '');
    },
    warn(message: string, meta?: Record<string, unknown>) {
      console.warn(prefix('WARN'), message, meta ?? '');
    },
    error(message: string, meta?: Record<string, unknown>) {
      console.error(prefix('ERROR'), message, meta ?? '');
    },
  };
}
