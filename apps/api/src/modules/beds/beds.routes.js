import { Router } from 'express';
import { bedsController } from './beds.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import {
  getBedsParamsSchema,
  adjustBedCountersSchema,
  putBedCountersSchema,
  expectedDischargesSchema,
  createBedRequestSchema,
  decideBedRequestSchema,
  bedRequestParamsSchema
} from './beds.schema.js';

// 1. Hospital Bed Inventory Sub-router (mounted on /api/v1/hospitals/:id/beds)
export const hospitalBedsRouter = Router({ mergeParams: true });

hospitalBedsRouter.get(
  '/',
  validate(getBedsParamsSchema),
  bedsController.getHospitalBeds
);

hospitalBedsRouter.post(
  '/:wardType/adjust',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  idempotencyMiddleware,
  validate(adjustBedCountersSchema),
  bedsController.adjustBedCounters
);

hospitalBedsRouter.put(
  '/:wardType',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(putBedCountersSchema),
  bedsController.putBedCounters
);

hospitalBedsRouter.post(
  '/:wardType/expected-discharges',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(expectedDischargesSchema),
  bedsController.addExpectedDischarges
);

// 2. Bed Requests Router (mounted on /api/v1/bed-requests)
export const bedRequestsRouter = Router();

bedRequestsRouter.post(
  '/',
  requireAuth,
  idempotencyMiddleware,
  validate(createBedRequestSchema),
  bedsController.createBedRequest
);

bedRequestsRouter.get(
  '/me',
  requireAuth,
  bedsController.getPatientRequests
);

bedRequestsRouter.get(
  '/my',
  requireAuth,
  bedsController.getPatientRequests
);

bedRequestsRouter.get(
  '/mine',
  requireAuth,
  bedsController.getPatientRequests
);

bedRequestsRouter.get(
  '/hospital/:id',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  bedsController.getHospitalRequests
);

bedRequestsRouter.post(
  '/:id/decide',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  validate(decideBedRequestSchema),
  bedsController.decideBedRequest
);

bedRequestsRouter.patch(
  '/:id/decision',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  validate(decideBedRequestSchema),
  bedsController.decideBedRequest
);

bedRequestsRouter.post(
  '/:id/cancel',
  requireAuth,
  validate(bedRequestParamsSchema),
  bedsController.cancelBedRequest
);

bedRequestsRouter.patch(
  '/:id/cancel',
  requireAuth,
  validate(bedRequestParamsSchema),
  bedsController.cancelBedRequest
);

bedRequestsRouter.post(
  '/:id/admit',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  validate(bedRequestParamsSchema),
  bedsController.admitBedRequest
);

// 3. City Summary Router (mounted on /api/v1/city-summary)
export const citySummaryRouter = Router();

citySummaryRouter.get(
  '/',
  bedsController.getCitySummary
);

export default {
  hospitalBedsRouter,
  bedRequestsRouter,
  citySummaryRouter
};

