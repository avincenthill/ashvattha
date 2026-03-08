/**
 * Acceptable API error codes.
 * Use AppError with these codes for consistent API error responses.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: { status: 400, message: 'Validation failed' },
  PARENT_NOT_FOUND: { status: 404, message: 'Parent node does not exist' },
  REQUEST_TIMEOUT: { status: 408, message: 'Request timeout' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: ErrorCode
  ) {
    super(message);
    this.name = 'AppError';
  }
}
