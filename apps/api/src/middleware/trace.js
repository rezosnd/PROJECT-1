import crypto from 'node:crypto';

/**
 * Distributed Systems Note: Correlation / Trace ID.
 * Every incoming HTTP request is assigned a unique trace ID (propagated via x-trace-id header).
 * This allows requests traversing multiple distributed micro-services, load balancers,
 * or background queue processors to be uniquely correlated in log traces.
 */
export function traceMiddleware(req, res, next) {
  const incomingTraceId = req.headers['x-trace-id'];
  const traceId = (typeof incomingTraceId === 'string' && incomingTraceId.trim()) 
    ? incomingTraceId.trim() 
    : crypto.randomUUID();

  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}

