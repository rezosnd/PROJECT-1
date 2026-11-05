import { logger } from '../infra/logger.js';

export function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      traceId: req.traceId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request 5xx Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request 4xx Warning');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
}

