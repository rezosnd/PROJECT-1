import { Router } from 'express';
import { referralsController } from './referrals.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  scanPatientSchema,
  createReferralSchema,
  referralIdParamSchema,
} from './referrals.schema.js';

const router = Router();

// Patient: Care QR for doctors to scan
router.get(
  '/my-qr',
  requireAuth,
  requireRole('PATIENT'),
  referralsController.myQr
);

// Patient / Doctor: list own referrals
router.get(
  '/me',
  requireAuth,
  requireRole('PATIENT', 'DOCTOR'),
  referralsController.listMine
);

// Departments for a hospital (doctor referral picker) — before /:id
router.get(
  '/hospitals/:hospitalId/departments',
  requireAuth,
  requireRole('DOCTOR', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'),
  referralsController.departments
);

// Hospital staff inbox of inbound referrals
router.get(
  '/hospital/:hospitalId',
  requireAuth,
  requireRole('HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'),
  requireTenant,
  referralsController.hospitalInbox
);

// Doctor: scan patient QR → full clinical profile
router.post(
  '/scan',
  requireAuth,
  requireRole('DOCTOR'),
  validate(scanPatientSchema),
  referralsController.scan
);

// Doctor: create referral (+ optional 15-min bed hold)
router.post(
  '/',
  requireAuth,
  requireRole('DOCTOR'),
  validate(createReferralSchema),
  referralsController.create
);

router.get(
  '/:id',
  requireAuth,
  requireRole('PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'),
  validate(referralIdParamSchema),
  referralsController.getById
);

export default router;
