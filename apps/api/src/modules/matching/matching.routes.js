import { Router } from 'express';
import { matchingController } from './matching.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { matchRequestSchema } from './matching.schema.js';

const router = Router();

// Public multi-criteria condition matching
router.post(
  '/',
  validateRequest({ body: matchRequestSchema }),
  matchingController.match
);

export default router;

