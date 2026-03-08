/**
 * Optional idempotency for write requests.
 * When Idempotency-Key header is present, duplicate requests return the stored response.
 */
import { Request, Response, NextFunction } from "express";
import { getIdempotencyEntry, setIdempotencyEntry } from "../db/idempotency.js";

const KEY_REGEX = /^[a-zA-Z0-9_-]{1,255}$/;

function getKey(req: Request): string | null {
  const raw = req.headers["idempotency-key"];
  const key = typeof raw === "string" ? raw.trim() : null;
  return key && KEY_REGEX.test(key) ? key : null;
}

/**
 * Middleware for POST routes. When Idempotency-Key is present:
 * - First request: runs handler, stores response, returns it
 * - Duplicate request: returns stored response without re-executing
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.method !== "POST") {
    next();
    return;
  }

  const key = getKey(req);
  if (!key) {
    next();
    return;
  }

  const stored = getIdempotencyEntry(key);
  if (stored) {
    res.status(stored.status).json(stored.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    setIdempotencyEntry(key, res.statusCode, body);
    return originalJson(body);
  };
  next();
}
