import { Request, Response, NextFunction } from 'express';

export class RequestTimeoutError extends Error {
  constructor() {
    super('Request timeout');
    this.name = 'RequestTimeoutError';
  }
}

/**
 * Middleware that aborts requests exceeding the given timeout.
 * Sends 408 Request Timeout when the limit is reached.
 */
export function requestTimeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new RequestTimeoutError());
      }
    }, ms);

    const cleanup = () => clearTimeout(timer);
    res.once('finish', cleanup);
    res.once('close', cleanup);

    next();
  };
}
