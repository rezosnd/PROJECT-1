import { pool, withTransaction } from '../../infra/db.js';
import { adminRepository } from './admin.repository.js';
import { AppError } from '../../middleware/error-handler.js';

export const adminService = {
  /**
   * Pre-register staff by email and assign to a hospital tenant.
   * CITY_ADMIN can assign to any hospital.
   * HOSPITAL_ADMIN can only assign staff to their own hospital.
   */
  async preregisterStaff({
    email,
    role,
    hospitalId,
    specialty = null,
    licenseNo = null,
    vehicleNo = null,
    ambulanceType = null,
    actor,
    ip = null,
  }) {
    // Tenant permission check
    // HOSPITAL_ADMIN may register staff + ambulance units for their own hospital.
    // CITY_ADMIN may register anyone (including doctors / city-wide ambulances).
    if (actor.role === 'HOSPITAL_ADMIN') {
      if (role === 'DOCTOR') {
        throw new AppError('Only City Admin can pre-register doctors', 403, 'FORBIDDEN');
      }
      if (actor.hospitalId !== hospitalId) {
        throw new AppError('Hospital admins can only register staff for their own hospital tenant', 403, 'TENANT_ACCESS_DENIED');
      }
    } else if (actor.role !== 'CITY_ADMIN') {
      throw new AppError('Only municipal administrators or hospital administrators may register staff', 403, 'FORBIDDEN');
    }

    let hospital = null;
    if (hospitalId) {
      hospital = await adminRepository.hospitalExists(pool, hospitalId);
      if (!hospital) {
        throw new AppError('Specified hospital does not exist in the registry', 404, 'HOSPITAL_NOT_FOUND');
      }
    } else if (role !== 'DOCTOR' && role !== 'AMBULANCE') {
      throw new AppError('hospitalId is required for hospital staff', 400, 'HOSPITAL_REQUIRED');
    }

    if (role === 'AMBULANCE' && !hospitalId && actor.role === 'HOSPITAL_ADMIN') {
      throw new AppError('hospitalId is required when registering an ambulance unit', 400, 'HOSPITAL_REQUIRED');
    }

    const resolvedVehicleNo = vehicleNo || licenseNo || null;
    const resolvedAmbulanceType = ambulanceType || (role === 'AMBULANCE' ? 'ALS' : null);
    const resolvedCallSign = specialty || null;

    return await withTransaction(async (client) => {
      const prereg = await adminRepository.upsertPreregisteredStaff(client, {
        email,
        role,
        hospitalId,
        specialty: resolvedCallSign,
        licenseNo: resolvedVehicleNo,
        vehicleNo: resolvedVehicleNo,
        ambulanceType: resolvedAmbulanceType,
      });

      const existingUser = await adminRepository.updateUserRoleAndHospital(client, email, {
        role,
        hospitalId,
        specialty: resolvedCallSign,
        licenseNo: resolvedVehicleNo,
      });

      // If the Gmail already signed in before, bind / refresh the ambulances fleet row now
      if (role === 'AMBULANCE' && existingUser?.id) {
        const callSign =
          resolvedCallSign || `BBSR-AMB-${String(existingUser.id).slice(0, 4).toUpperCase()}`;
        const plate = resolvedVehicleNo || `OD-02-${String(Date.now()).slice(-4)}`;
        await client.query(
          `INSERT INTO ambulances (
             user_id, hospital_id, call_sign, vehicle_no, ambulance_type, status, city, active
           ) VALUES ($1, $2, $3, $4, $5, 'OFFLINE', 'Bhubaneswar', TRUE)
           ON CONFLICT (user_id) DO UPDATE SET
             hospital_id = COALESCE(EXCLUDED.hospital_id, ambulances.hospital_id),
             call_sign = EXCLUDED.call_sign,
             vehicle_no = EXCLUDED.vehicle_no,
             ambulance_type = EXCLUDED.ambulance_type,
             active = TRUE,
             updated_at = NOW()`,
          [existingUser.id, hospitalId, callSign, plate, resolvedAmbulanceType || 'ALS']
        );
      }

      await adminRepository.insertAuditLog(client, {
        actorId: actor.sub || actor.id,
        action:
          role === 'DOCTOR'
            ? 'DOCTOR_PREREGISTERED'
            : role === 'AMBULANCE'
              ? 'AMBULANCE_PREREGISTERED'
              : 'STAFF_PREREGISTERED',
        resourceType:
          role === 'DOCTOR' ? 'DOCTOR' : role === 'AMBULANCE' ? 'AMBULANCE' : 'HOSPITAL_STAFF',
        resourceId: existingUser?.id || prereg.id,
        ip,
        meta: {
          email,
          role,
          hospitalId,
          specialty: resolvedCallSign,
          vehicleNo: resolvedVehicleNo,
          ambulanceType: resolvedAmbulanceType,
          hospitalName: hospital?.name || null,
        },
      });

      return {
        id: prereg.id,
        email: prereg.email,
        role: prereg.role,
        hospitalId: prereg.hospital_id,
        hospitalName: hospital?.name || null,
        specialty: prereg.specialty || resolvedCallSign,
        licenseNo: prereg.license_no || resolvedVehicleNo,
        vehicleNo: prereg.vehicle_no || resolvedVehicleNo,
        ambulanceType: prereg.ambulance_type || resolvedAmbulanceType,
        existingUserUpdated: Boolean(existingUser),
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

