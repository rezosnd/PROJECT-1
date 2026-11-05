import { logger } from '../infra/logger.js';

export class AppError extends Error {
  constructor(arg1, arg2 = 500, arg3 = 'INTERNAL_ERROR', details = null) {
    let message, statusCode, code;
    if (typeof arg2 === 'number') {
      message = arg1;
      statusCode = arg2;
      code = typeof arg3 === 'string' ? arg3 : 'INTERNAL_ERROR';
    } else if (typeof arg3 === 'number') {
      code = arg1;
      message = arg2;
      statusCode = arg3;
    } else {
      message = arg1;
      statusCode = 500;
      code = 'INTERNAL_ERROR';
    }
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, next) {
  const traceId = req.traceId || 'unknown';
  let statusCode = err.statusCode || (err.status ? err.status : 500);
  let code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  let message = err.message || 'An unexpected error occurred';
  const details = err.details || undefined;

  // Gracefully map CORS rejection errors to HTTP 403 instead of 500
  if (message.includes('not permitted by CORS')) {
    statusCode = 403;
    code = 'CORS_ORIGIN_DENIED';
  }

  if (statusCode >= 500) {
    logger.error({ traceId, err: { message: err.message, stack: err.stack } }, '[Error Envelope] Unhandled Exception');
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    traceId
  });
}

