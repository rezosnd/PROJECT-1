import { AppError } from './error-handler.js';

/**
 * Zod validation middleware factory.
 * Validates request payload, query, and path params, rejecting malformed contracts with HTTP 422.
 * Supports both unified Zod schemas { body, query, params } and segmented schemas { body: ..., query: ... }.
 */
export function validate(schema) {
  return async (req, res, next) => {
    try {
      if (typeof schema.parseAsync === 'function') {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        });

        // Replace with sanitized/coerced data
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
        if (schema.body && typeof schema.body.parseAsync === 'function') {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query && typeof schema.query.parseAsync === 'function') {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params && typeof schema.params.parseAsync === 'function') {
          req.params = await schema.params.parseAsync(req.params);
        }
      }

      next();
    } catch (err) {
      if (err.errors) {
        const formattedDetails = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          rule: e.code
        }));
        const summary = formattedDetails.map(d => `${d.path}: ${d.message}`).join('; ');
        return next(new AppError(`Schema validation failed: ${summary}`, 422, 'VALIDATION_ERROR', formattedDetails));
      }
      next(err);
    }
  };
}

export const validateRequest = validate;
