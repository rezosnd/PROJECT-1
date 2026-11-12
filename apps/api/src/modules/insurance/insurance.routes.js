import { Router } from 'express';
import { insuranceController } from './insurance.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  savePatientInsuranceSchema,
  saveHospitalNetworkSchema,
  hospitalIdParamsSchema,
} from './insurance.schema.js';

const router = Router();

router.get('/', insuranceController.listInsurers);

router.get('/doctors', insuranceController.listDoctors);

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

router.get(
  '/hospitals/:hospitalId',
  validate(hospitalIdParamsSchema),
  insuranceController.hospitalInsurers
);

router.put(
  '/hospitals/:hospitalId',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(saveHospitalNetworkSchema),
  insuranceController.saveHospitalInsurers
);

export default router;
