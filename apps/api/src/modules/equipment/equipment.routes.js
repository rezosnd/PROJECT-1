import { Router } from 'express';
import { equipmentController } from './equipment.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  listHospitalEquipmentSchema,
  getEquipmentParamsSchema,
  searchEquipmentSchema,
  createEquipmentSchema,
  updateEquipmentStatusSchema
} from './equipment.schema.js';

// 1. Hospital Equipment Sub-Router (mounted on /api/v1/hospitals/:id/equipment)
export const hospitalEquipmentRouter = Router({ mergeParams: true });

hospitalEquipmentRouter.get(
  '/',
  validate(listHospitalEquipmentSchema),
  equipmentController.listHospitalEquipment
);

hospitalEquipmentRouter.get(
  '/summary',
  equipmentController.getHospitalEquipmentSummary
);

hospitalEquipmentRouter.post(
  '/',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  requireTenant,
  validate(createEquipmentSchema),
  equipmentController.createEquipment
);

// 2. Global Equipment Router (mounted on /api/v1/equipment)
export const equipmentRouter = Router();

equipmentRouter.get(
  '/',
  validate(searchEquipmentSchema),
  equipmentController.searchEquipment
);

equipmentRouter.get(
  '/search',
  validate(searchEquipmentSchema),
  equipmentController.searchEquipment
);

equipmentRouter.get(
  '/:id',
  validate(getEquipmentParamsSchema),
  equipmentController.getEquipmentById
);

equipmentRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN'),
  validate(updateEquipmentStatusSchema),
  equipmentController.updateEquipmentStatus
);

export default {
  hospitalEquipmentRouter,
  equipmentRouter
};

