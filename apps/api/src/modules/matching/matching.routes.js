import { Router } from 'express';
import { matchingController } from './matching.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { matchRequestSchema } from './matching.schema.js';
import { verifyAccessToken } from '../auth/jwt.js';

const router = Router();

/** Soft auth — if Bearer present, attach req.user for insurance-aware ranking */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.substring(7).trim());
      decoded.id = decoded.id || decoded.sub;
      req.user = decoded;
    } catch {
      // ignore invalid token for public match
    }
  }
  next();
}

// Public multi-criteria condition matching (insurance boost when patient is logged in)
router.post(
  '/',
  optionalAuth,
  validateRequest({ body: matchRequestSchema }),
  matchingController.match
);

export default router;
