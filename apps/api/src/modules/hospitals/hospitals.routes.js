import { Router } from 'express';
import { hospitalsController } from './hospitals.controller.js';
import { hospitalBedsRouter } from '../beds/beds.routes.js';
import { bedsController } from '../beds/beds.controller.js';
import { hospitalEquipmentRouter } from '../equipment/equipment.routes.js';
import { forecastController } from '../forecast/forecast.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  listHospitalsSchema,
  getHospitalParamsSchema,
  createHospitalSchema,
  updateHospitalSchema,
  verifyHospitalSchema
} from './hospitals.schema.js';

const router = Router();

// Sub-resource routers: Beds and Equipment scoped to hospital
router.use('/:id/beds', hospitalBedsRouter);
router.use('/:id/equipment', hospitalEquipmentRouter);

// Predictive availability forecasting for beds and equipment
router.get('/:id/forecast', forecastController.getWardForecast);
router.get('/:id/equipment-forecast', forecastController.getEquipmentForecast);

// Staff access to incoming hospital bed requests
router.get(
  '/:id/bed-requests',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  bedsController.getHospitalRequests
);

// Public search and discovery with PostGIS and 30s Redis cache
router.get(
  '/',
  validate(listHospitalsSchema),
  hospitalsController.searchHospitals
);

// Public hospital detail view with live bed breakdown and equipment summary
router.get(
  '/:id',
  validate(getHospitalParamsSchema),
  hospitalsController.getHospitalById
);

// Create new hospital (CITY_ADMIN only)
router.post(
  '/',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validate(createHospitalSchema),
  hospitalsController.createHospital
);

// Update hospital profile (Own hospital staff or CITY_ADMIN)
router.patch(
  '/:id',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(updateHospitalSchema),
  hospitalsController.updateHospital
);

// Upload hospital photo to Cloudinary
router.post(
  '/:id/photo',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  hospitalsController.uploadPhoto
);

// General asset upload to Cloudinary (authenticated)
router.post(
  '/upload-asset',
  requireAuth,
  hospitalsController.uploadAsset
);

// Verify hospital status (CITY_ADMIN only)
router.patch(
  '/:id/verify',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validate(verifyHospitalSchema),
  hospitalsController.verifyHospital
);

export default router;
