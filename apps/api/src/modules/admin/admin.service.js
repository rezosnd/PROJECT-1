import { pool, withTransaction } from '../../infra/db.js';
import { adminRepository } from './admin.repository.js';
import { AppError } from '../../middleware/error-handler.js';

export const adminService = {
  /**
   * Pre-register staff by email and assign to a hospital tenant.
   * CITY_ADMIN can assign to any hospital.
   * HOSPITAL_ADMIN can only assign staff to their own hospital.
   */
  async preregisterStaff({ email, role, hospitalId, actor, ip = null }) {
    // Tenant permission check
    if (actor.role === 'HOSPITAL_ADMIN') {
      if (actor.hospitalId !== hospitalId) {
        throw new AppError('Hospital admins can only register staff for their own hospital tenant', 403, 'TENANT_ACCESS_DENIED');
      }
    } else if (actor.role !== 'CITY_ADMIN') {
      throw new AppError('Only municipal administrators or hospital administrators may register staff', 403, 'FORBIDDEN');
    }

    // Verify target hospital exists
    const hospital = await adminRepository.hospitalExists(pool, hospitalId);
    if (!hospital) {
      throw new AppError('Specified hospital does not exist in the registry', 404, 'HOSPITAL_NOT_FOUND');
    }

    return await withTransaction(async (client) => {
      // 1. Persist pre-registration entry
      const prereg = await adminRepository.upsertPreregisteredStaff(client, {
        email,
        role,
        hospitalId
      });

      // 2. If user already exists in the system, update role and hospital immediately
      const existingUser = await adminRepository.updateUserRoleAndHospital(client, email, {
        role,
        hospitalId
      });

      // 3. Log audit event
      await adminRepository.insertAuditLog(client, {
        actorId: actor.sub,
        action: 'STAFF_PREREGISTERED',
        resourceType: 'HOSPITAL_STAFF',
        resourceId: existingUser?.id || prereg.id,
        ip,
        meta: { email, role, hospitalId, hospitalName: hospital.name }
      });

      return {
        id: prereg.id,
        email: prereg.email,
        role: prereg.role,
        hospitalId: prereg.hospital_id,
        hospitalName: hospital.name,
        existingUserUpdated: Boolean(existingUser)
      };
    });
  },

  /**
   * Paginated user directory for City Administration (active emails / roles)
   */
  async listUsers({ page = 1, limit = 20, role, status, search }) {
    const result = await adminRepository.listUsers(pool, { page, limit, role, status, search });
    return {
      ...result,
      users: result.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        pictureUrl: u.picture_url,
        role: u.role,
        hospitalId: u.hospital_id,
        hospitalName: u.hospital_name,
        status: u.status,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        profileComplete: Boolean(u.profile_complete),
        bloodGroup: u.blood_group,
        gender: u.gender,
        cityName: u.city_name,
        emergencyContactPhone: u.emergency_contact_phone,
        ageYears: u.age_years
      }))
    };
  },

  /**
   * Update user status (ACTIVE | SUSPENDED).
   * Suspending immediately revokes active refresh tokens.
   */
  async updateUserStatus({ targetUserId, status, actorId, ip = null }) {
    if (targetUserId === actorId && status === 'SUSPENDED') {
      throw new AppError('Administrators cannot suspend their own identity', 400, 'SELF_SUSPENSION_PROHIBITED');
    }

    const user = await adminRepository.findUserById(pool, targetUserId);
    if (!user) {
      throw new AppError('Target user identity not found', 404, 'USER_NOT_FOUND');
    }

    return await withTransaction(async (client) => {
      const updatedUser = await adminRepository.updateUserStatus(client, targetUserId, status);

      // If suspended, revoke all active refresh tokens immediately
      if (status === 'SUSPENDED') {
        await adminRepository.revokeAllUserTokens(client, targetUserId);
      }

      await adminRepository.insertAuditLog(client, {
        actorId,
        action: 'USER_STATUS_UPDATED',
        resourceType: 'USER',
        resourceId: targetUserId,
        ip,
        meta: { previousStatus: user.status, newStatus: status, email: user.email }
      });

      return updatedUser;
    });
  }
};

