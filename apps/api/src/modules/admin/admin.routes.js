import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAuth, requireRole, requireTenant } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { preregisterStaffSchema, listUsersSchema, updateUserStatusSchema } from './admin.schema.js';

const router = Router();

// Staff pre-registration (CITY_ADMIN can assign any hospital; HOSPITAL_ADMIN can only assign their own hospital)
// requireTenant ensures hospital staff identity bounds cannot be spoofed or overridden in request body
router.post(
  '/staff',
  requireAuth,
  requireRole('CITY_ADMIN', 'HOSPITAL_ADMIN'),
  requireTenant,
  idempotencyMiddleware(),
  validate(preregisterStaffSchema),
  adminController.preregisterStaff
);

// List users with filtering and pagination (CITY_ADMIN only)
router.get(
  '/users',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validate(listUsersSchema),
  adminController.listUsers
);

// Update user status (CITY_ADMIN only)
router.patch(
  '/users/:id/status',
  requireAuth,
  requireRole('CITY_ADMIN'),
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);

export default router;

