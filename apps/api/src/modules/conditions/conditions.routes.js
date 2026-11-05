import { Router } from 'express';
import { conditionsController } from './conditions.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  searchConditionsQuerySchema,
  conditionIdParamSchema,
  createConditionSchema,
  updateConditionSchema
} from './conditions.schema.js';

const router = Router();

// Public condition directory & autocomplete search
router.get(
  '/',
  validateRequest({ query: searchConditionsQuerySchema }),
  conditionsController.search
);

router.get(
  '/:id',
  validateRequest({ params: conditionIdParamSchema }),
  conditionsController.getById
);

// City-Admin clinical capability governance
router.post(
  '/',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validateRequest({ body: createConditionSchema }),
  conditionsController.create
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validateRequest({ params: conditionIdParamSchema, body: updateConditionSchema }),
  conditionsController.update
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validateRequest({ params: conditionIdParamSchema }),
  conditionsController.remove
);

export default router;

