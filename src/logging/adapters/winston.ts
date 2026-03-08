import winston from 'winston';
import { config } from '../../config.js';
import type { Logger } from '../types.js';

const { combine, timestamp, json, colorize, simple } = winston.format;

function createWinstonLogger(): Logger {
  const winstonLogger = winston.createLogger({
    level: config.nodeEnv === 'test' ? 'silent' : config.nodeEnv === 'production' ? 'info' : 'debug',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      config.nodeEnv === 'production' ? json() : combine(colorize(), simple())
    ),
    defaultMeta: { service: 'tree-api' },
    transports: [new winston.transports.Console()],
  });

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      winstonLogger.debug(message, meta);
    },
    info(message: string, meta?: Record<string, unknown>) {
      winstonLogger.info(message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      winstonLogger.warn(message, meta);
    },
    error(message: string, meta?: Record<string, unknown>) {
      winstonLogger.error(message, meta);
    },
  };
}

export { createWinstonLogger };
