import { Router } from 'express';
import { bloodController } from './blood.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import {
  searchBloodBanksSchema,
  hospitalIdParamSchema,
  upsertStockSchema,
  bulkStockSchema,
  bloodBankSettingsSchema,
  createBloodRequestSchema,
  decideBloodRequestSchema,
  bloodRequestIdSchema,
} from './blood.schema.js';

const router = Router();

router.get('/catalog', bloodController.catalog);

router.get(
  '/banks',
  validate(searchBloodBanksSchema),
  bloodController.search
);

router.get(
  '/hospitals/:id',
  validate(hospitalIdParamSchema),
  bloodController.getHospital
);

router.patch(
  '/hospitals/:id/settings',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(bloodBankSettingsSchema),
  bloodController.updateSettings
);

router.put(
  '/hospitals/:id/stock',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(upsertStockSchema),
  bloodController.upsertStock
);

router.put(
  '/hospitals/:id/stock/bulk',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(bulkStockSchema),
  bloodController.bulkStock
);

router.get(
  '/hospitals/:id/requests',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  bloodController.hospitalQueue
);

router.post(
  '/requests',
  requireAuth,
  requireRole('PATIENT'),
  idempotencyMiddleware(),
  validate(createBloodRequestSchema),
  bloodController.createRequest
);

router.get(
  '/requests/me',
  requireAuth,
  requireRole('PATIENT'),
  bloodController.myRequests
);

router.post(
  '/requests/:id/cancel',
  requireAuth,
  requireRole('PATIENT'),
  validate(bloodRequestIdSchema),
  bloodController.cancel
);

router.post(
  '/requests/:id/decide',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  validate(decideBloodRequestSchema),
  bloodController.decide
);

export default router;
