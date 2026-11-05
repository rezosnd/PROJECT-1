import crypto from 'node:crypto';
import { withTransaction, pool } from '../../infra/db.js';
import { authRepository } from './auth.repository.js';
import { verifyGoogleIdToken } from './google-verifier.js';
import { generateAccessToken, generateRefreshTokenString, hashToken } from './jwt.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { emailService } from '../../infra/email.js';

function sanitizeUser(u) {
  const abhaPhoto = u.abha_photo_url || null;
  return {
    id: u.id,
    googleSub: u.google_sub,
    email: u.email,
    name: u.full_name || u.name,
    // Prefer ABHA KYC photo over Google avatar when linked
    pictureUrl: abhaPhoto || u.picture_url,
    googlePictureUrl: u.picture_url,
    abhaPhotoUrl: abhaPhoto,
    role: u.role,
    hospitalId: u.hospital_id,
    status: u.status,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
    profileComplete: Boolean(u.profile_complete),
    profile: {
      fullName: u.full_name || u.name,
      dateOfBirth: u.date_of_birth,
      gender: u.gender,
      bloodGroup: u.blood_group,
      ageYears: u.age_years,
      addressLine: u.address_line,
      cityName: u.city_name,
      pinCode: u.pin_code,
      emergencyContactName: u.emergency_contact_name,
      emergencyContactPhone: u.emergency_contact_phone,
      mobilePhone: u.mobile_phone || u.emergency_contact_phone || null,
      allergies: u.allergies,
      medicalNotes: u.medical_notes,
      preferredLanguage: u.preferred_language || 'en',
      completedAt: u.profile_completed_at
    },
    needsProfileSetup: u.role === 'PATIENT' && !u.profile_complete
  };
}

export const authService = {
  /**
   * Google (Gmail) OAuth sign-in with automatic staff role binding and admin elevation.
   */
  async loginWithGoogle({ idToken, clientType = 'web', ip = null, requestedRole = null, hospitalId = null }) {
    // 1. Verify Google ID token signature and verify email address
    const googleProfile = await verifyGoogleIdToken(idToken, clientType);

    return await withTransaction(async (client) => {
      // 2. Lookup existing user
      let user = await authRepository.findUserByGoogleSub(client, googleProfile.sub);
      if (!user) {
        user = await authRepository.findUserByEmail(client, googleProfile.email);
      }

      // 3. Role binding — production-safe (no self-elevate via requestedRole)
      const prereg = await authRepository.findPreregisteredStaff(client, googleProfile.email);
      const emailLc = googleProfile.email.toLowerCase();
      const isSeedAdmin =
        emailLc === String(config.SEED_ADMIN_EMAIL || '').toLowerCase() ||
        emailLc === 'cityadmin.bhubaneswar@gmail.com';

      let targetRole = 'PATIENT';
      let targetHospitalId = null;

      if (isSeedAdmin) {
        targetRole = 'CITY_ADMIN';
      } else if (prereg) {
        targetRole = prereg.role;
        targetHospitalId = prereg.hospital_id || hospitalId || null;
        await authRepository.consumePreregisteredStaff(client, prereg.id);
      } else if (user && user.role && user.role !== 'PATIENT') {
        // Keep existing elevated role on subsequent logins
        targetRole = user.role;
        targetHospitalId = user.hospital_id;
      } else if (requestedRole === 'PATIENT' || !requestedRole) {
        targetRole = 'PATIENT';
      } else if (
        requestedRole === 'HOSPITAL_STAFF' ||
        requestedRole === 'HOSPITAL_ADMIN' ||
        requestedRole === 'CITY_ADMIN'
      ) {
        throw new AppError(
          requestedRole === 'CITY_ADMIN'
            ? 'This Google account is not authorized as City Admin.'
            : 'This Gmail is not pre-registered as hospital staff. Ask your hospital admin to add your email under Staff Access, then sign in again.',
          403,
          'STAFF_NOT_PREREGISTERED'
        );
      }

      // 4. Create or update user record
      if (!user) {
        user = await authRepository.createUser(client, {
          googleSub: googleProfile.sub,
          email: googleProfile.email,
          name: googleProfile.name,
          pictureUrl: googleProfile.picture,
          role: targetRole,
          hospitalId: targetHospitalId
        });
      } else {
        user = await authRepository.updateUserOnLogin(client, user.id, {
          googleSub: googleProfile.sub,
          name: googleProfile.name,
          pictureUrl: googleProfile.picture,
          role: targetRole,
          hospitalId: targetHospitalId
        });
      }

      // 5. Enforce account status check
      if (user.status === 'SUSPENDED') {
        throw new AppError('Your account has been suspended by municipal administration', 403, 'ACCOUNT_SUSPENDED');
      }

      // 6. Issue access and refresh tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshTokenString();
      const tokenHash = hashToken(refreshToken);
      const familyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await authRepository.createRefreshToken(client, {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt
      });

      // 7. Audit log the login
      await authRepository.insertAuditLog(client, {
        actorId: user.id,
        action: 'AUTH_LOGIN_GOOGLE',
        resourceType: 'USER',
        resourceId: user.id,
        ip,
        meta: { clientType, email: user.email, role: user.role }
      });

      // Asynchronously transmit welcome email on account login/provision
      emailService.sendWelcomeEmail({
        to: user.email,
        name: user.name,
        role: user.role
      }).catch(() => {});

      return {
        accessToken,
        refreshToken,
        user: sanitizeUser(user)
      };
    });
  },

  /**
   * Distributed Systems Note: Refresh Token Rotation with Token Family Reuse Detection.
   * Rotating refresh tokens limit the exposure window of any single bearer token.
   * If an attacker steals a token and replays an already-consumed token, the database detects
   * that revoked_at IS NOT NULL, immediately revoking the entire token family (family_id)
   * to protect the legitimate user across all devices.
   */
  async refreshSession({ refreshToken, ip = null }) {
    const tokenHash = hashToken(refreshToken);

    // Distributed Systems Note: Transactional Row Locking on Token Rotation.
    // By wrapping token lookup in SELECT ... FOR UPDATE inside the transaction,
    // concurrent refresh requests on the same bearer token are strictly serialized,
    // preventing race condition bypasses and eliminating false-positive token family revokes.
    return await withTransaction(async (client) => {
      const existing = await authRepository.findRefreshTokenByHashForUpdate(client, tokenHash);

      if (!existing) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Reuse detection
      if (existing.revoked_at !== null) {
        await authRepository.revokeFamily(client, existing.family_id);
        await authRepository.insertAuditLog(client, {
          actorId: existing.user_id,
          action: 'AUTH_REFRESH_REUSE_DETECTED',
          resourceType: 'REFRESH_TOKEN_FAMILY',
          resourceId: existing.family_id,
          ip,
          meta: { revokedAt: existing.revoked_at }
        });
        throw new AppError('Refresh token reuse detected. Token family revoked.', 401, 'REFRESH_TOKEN_REUSED');
      }

      // Expiry check
      if (new Date(existing.expires_at) < new Date()) {
        await authRepository.revokeRefreshToken(client, existing.id);
        throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
      }

      // Check user validity
      const user = await authRepository.findUserById(client, existing.user_id);
      if (!user || user.status === 'SUSPENDED') {
        await authRepository.revokeFamily(client, existing.family_id);
        throw new AppError('Account inactive or suspended', 403, 'ACCOUNT_INACTIVE');
      }

      // Invalidate current token
      await authRepository.revokeRefreshToken(client, existing.id);

      // Generate new token pair
      const newRefreshToken = generateRefreshTokenString();
      const newTokenHash = hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await authRepository.createRefreshToken(client, {
        userId: user.id,
        tokenHash: newTokenHash,
        familyId: existing.family_id,
        expiresAt
      });

      const accessToken = generateAccessToken(user);

      await authRepository.insertAuditLog(client, {
        actorId: user.id,
        action: 'AUTH_REFRESH_SUCCESS',
        resourceType: 'REFRESH_TOKEN',
        resourceId: existing.id,
        ip,
        meta: { familyId: existing.family_id }
      });

      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    });
  },

  /**
   * Log out session: revoke active token family or user sessions
   */
  async logout({ userId, refreshToken, ip = null }) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const record = await authRepository.findRefreshTokenByHash(pool, tokenHash);
      if (record) {
        await authRepository.revokeFamily(pool, record.family_id);
      }
    } else if (userId) {
      await authRepository.revokeAllUserTokens(pool, userId);
    }

    if (userId) {
      await authRepository.insertAuditLog(pool, {
        actorId: userId,
        action: 'AUTH_LOGOUT',
        resourceType: 'USER',
        resourceId: userId,
        ip,
        meta: {}
      });
    }

    return { message: 'Logged out successfully' };
  },

  /**
   * Retrieve current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await authRepository.findUserById(pool, userId);
    if (!user) {
      throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
    }
    return sanitizeUser(user);
  },

  /**
   * First-login clinical intake so hospitals receive complete patient details on booking.
   */
  async completePatientProfile(userId, profile, ip = null) {
    const existing = await authRepository.findUserById(pool, userId);
    if (!existing) {
      throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
    }
    if (existing.role !== 'PATIENT') {
      throw new AppError('Only patient accounts complete clinical intake', 403, 'FORBIDDEN');
    }

    const updated = await authRepository.updatePatientProfile(pool, userId, profile);
    await authRepository.insertAuditLog(pool, {
      actorId: userId,
      action: 'PATIENT_PROFILE_COMPLETED',
      resourceType: 'USER',
      resourceId: userId,
      ip,
      meta: {
        bloodGroup: profile.bloodGroup,
        gender: profile.gender,
        cityName: profile.cityName
      }
    });

    return sanitizeUser(updated);
  }
};

