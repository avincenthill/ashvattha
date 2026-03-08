import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { RequestTimeoutError } from './requestTimeout.js';
import { AppError, ERROR_CODES } from '../errors.js';

/** Consistent error response shape for all API errors. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: ErrorResponse = { error: { code, message } };
  if (details !== undefined) {
    body.error.details = details;
  }
  res.status(statusCode).json(body);
}

export { AppError };

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof RequestTimeoutError) {
    if (!res.headersSent) {
      const { status, message } = ERROR_CODES.REQUEST_TIMEOUT;
      sendError(res, status, 'REQUEST_TIMEOUT', message);
    }
    logger.warn('Request timeout');
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    const { status, message } = ERROR_CODES.VALIDATION_FAILED;
    sendError(res, status, 'VALIDATION_FAILED', message, details);
    logger.warn('Validation error', { errors: err.errors });
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    logger.warn('Application error', { statusCode: err.statusCode, code: err.code });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const { status, message } = ERROR_CODES.INTERNAL_ERROR;
  sendError(res, status, 'INTERNAL_ERROR', message);
}
