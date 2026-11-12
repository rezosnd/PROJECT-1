import { Router } from 'express';
import { sosController } from './sos.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import {
  createSosSchema,
  sosIdParamSchema,
  updateSosStatusSchema,
  cancelSosSchema,
  heartbeatSchema,
  pushTokenSchema,
} from './sos.schema.js';

const router = Router();
const sosRate = rateLimiter({ max: 20, windowMs: 60000, prefix: 'rl:sos' });

router.post(
  '/push-token',
  requireAuth,
  validate(pushTokenSchema),
  sosController.registerPush
);

router.post(
  '/',
  requireAuth,
  requireRole('PATIENT'),
  sosRate,
  validate(createSosSchema),
  sosController.create
);

router.get('/me', requireAuth, requireRole('PATIENT'), sosController.listMine);

router.get(
  '/offers',
  requireAuth,
  requireRole('AMBULANCE'),
  sosController.listOffers
);

router.get(
  '/ambulance/me',
  requireAuth,
  requireRole('AMBULANCE'),
  sosController.myAmbulance
);

router.post(
  '/ambulance/heartbeat',
  requireAuth,
  requireRole('AMBULANCE'),
  validate(heartbeatSchema),
  sosController.heartbeat
);

router.get(
  '/hospital/:hospitalId',
  requireAuth,
  requireRole('HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'),
  requireTenant,
  sosController.hospitalInbox
);

router.get(
  '/:id',
  requireAuth,
  requireRole('PATIENT', 'AMBULANCE', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'),
  validate(sosIdParamSchema),
  sosController.getById
);

router.post(
  '/:id/accept',
  requireAuth,
  requireRole('AMBULANCE'),
  sosRate,
  validate(sosIdParamSchema),
  sosController.accept
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('AMBULANCE'),
  validate(updateSosStatusSchema),
  sosController.updateStatus
);

router.post(
  '/:id/cancel',
  requireAuth,
  requireRole('PATIENT'),
  validate(cancelSosSchema),
  sosController.cancel
);

export default router;
