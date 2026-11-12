import { Router } from 'express';
import { insuranceController } from './insurance.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { savePatientInsuranceSchema } from './insurance.schema.js';

const router = Router();

router.get('/', insuranceController.listInsurers);

router.get(
  '/me',
  requireAuth,
  requireRole('PATIENT'),
  insuranceController.getMine
);

router.put(
  '/me',
  requireAuth,
  requireRole('PATIENT'),
  validate(savePatientInsuranceSchema),
  insuranceController.saveMine
);

export default router;
