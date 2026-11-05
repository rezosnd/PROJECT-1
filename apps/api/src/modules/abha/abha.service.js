import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { pool, withTransaction } from '../../infra/db.js';
import { abhaRepository } from './abha.repository.js';
import { getAbdmClient } from './abdmClient.js';
import { encryptAbhaNumber, hashAbhaNumber, maskAbhaNumber } from './abha.crypto.js';
import { extractAbhaPhoto, persistAbhaPhoto } from './abha.photo.js';
import { buildAbhaQrBundle } from './abha.qr.js';
import { authRepository } from '../auth/auth.repository.js';
import { emailService } from '../../infra/email.js';
import { logger } from '../../infra/logger.js';
import { composeAbhaPersonName } from './abdmClient.js';

async function resolveLinkDisplayName(userId, result) {
  const composed =
    composeAbhaPersonName(result, result?.profile, result?.profile?.abha_profile) ||
    (result?.name && String(result.name).trim()) ||
    null;
  if (composed) return composed;
  try {
    const user = await authRepository.findUserById(pool, userId);
    const fromUser = user?.full_name || user?.name || null;
    if (fromUser && String(fromUser).trim()) return String(fromUser).trim();
  } catch {
    /* ignore */
  }
  return 'ABHA User';
}

function getBadge() {
  if (config.ABDM_MODE === 'production') {
    return 'ABDM Production';
  }
  if (config.NODE_ENV === 'test') {
    return 'Sandbox / Mock';
  }
  return 'ABDM Verified';
}

function normalizeGender(g) {
  if (!g) return null;
  const u = String(g).trim().toUpperCase();
  if (u === 'M' || u === 'MALE') return 'MALE';
  if (u === 'F' || u === 'FEMALE') return 'FEMALE';
  if (u === 'O' || u === 'OTHER' || u === 'OTHERS') return 'OTHER';
  return u;
}

function formatAddress(address) {
  if (!address) return null;
  if (typeof address === 'string') return address;
  const parts = [
    address.line || address.line1 || address.house || address.street,
    address.village || address.locality || address.district,
    address.state,
    address.pincode || address.pin || address.postalCode,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function resolveAndStorePhoto(userId, result) {
  const extracted =
    extractAbhaPhoto(result) ||
    (result.photo
      ? /^https?:\/\//i.test(String(result.photo))
        ? { kind: 'url', value: String(result.photo) }
        : { kind: 'data', value: String(result.photo).startsWith('data:') ? String(result.photo) : `data:image/jpeg;base64,${String(result.photo)}` }
      : null);
  if (!extracted) return null;
  const url = await persistAbhaPhoto({ userId, photo: extracted });
  if (url) {
    try {
      await authRepository.setAbhaPhoto(pool, userId, url);
    } catch (err) {
      logger.warn({ err: err.message }, '[ABHA] setAbhaPhoto failed');
    }
  }
  return url;
}

async function mirrorDemographics(db, userId, result, photoUrl) {
  const gender = normalizeGender(result.gender || result.profile?.gender);
  const dob = result.dob || result.profile?.dob || null;
  const mobile = result.mobile || result.profile?.mobile || null;
  const addressLine = formatAddress(result.address || result.profile?.address);
  let ageYears = null;
  if (dob && /^\d{4}/.test(String(dob))) {
    ageYears = Math.max(0, new Date().getFullYear() - Number(String(dob).slice(0, 4)));
  }
  await authRepository.updatePatientProfile(db, userId, {
    fullName:
      composeAbhaPersonName(result, result.profile) ||
      result.name ||
      result.profile?.name ||
      null,
    dateOfBirth: dob,
    gender,
    ageYears,
    addressLine,
    cityName: result.profile?.address?.district || result.profile?.address?.city || null,
    pinCode: result.profile?.address?.pincode || result.profile?.address?.pin || null,
    emergencyContactPhone: mobile,
    mobilePhone: mobile,
    abhaPhotoUrl: photoUrl || null,
    preferredLanguage: 'en',
  });
}

export const abhaService = {
  getBadge,

  async _ensureActiveConsent(userId) {
    const consent = await abhaRepository.getActiveConsent(null, userId);
    if (!consent) {
      throw new AppError(
        'Active patient consent is required before performing ABDM operations. Call POST /api/v1/abha/consent first.',
        400,
        'CONSENT_REQUIRED'
      );
    }
    return consent;
  },

  async recordConsent({ userId, purpose, ip }) {
    return await withTransaction(async (client) => {
      const consent = await abhaRepository.createConsent(client, { userId, purpose });
      await abhaRepository.createAuditEntry(client, {
        actorId: userId,
        action: 'ABHA_CONSENT_GRANTED',
        resourceType: 'abha_consents',
        resourceId: consent.id,
        ip,
        meta: { purpose }
      });
      return {
        ...consent,
        badge: getBadge()
      };
    });
  },

  async revokeConsent({ userId, ip }) {
    return await withTransaction(async (client) => {
      const revoked = await abhaRepository.revokeConsent(client, userId);
      await abhaRepository.createAuditEntry(client, {
        actorId: userId,
        action: 'ABHA_CONSENT_REVOKED',
        resourceType: 'abha_consents',
        resourceId: userId,
        ip,
        meta: { revokedCount: revoked.length }
      });
      return {
        revoked: true,
        count: revoked.length,
        badge: getBadge()
      };
    });
  },

  async requestCreateOtp({ userId, aadhaar, ip }) {
    await this._ensureActiveConsent(userId);
    const client = getAbdmClient();
    const result = await client.generateAadhaarOtp({ aadhaar });
    const isSandboxTxn = Boolean(result.testOtp) || String(result.txnId || '').startsWith('txn-sbx-') || String(result.txnId || '').startsWith('mock-txn');

    // ONLY email sandbox OTP — real UIDAI OTP goes to Aadhaar-linked mobile (never email)
    if (isSandboxTxn && result.testOtp) {
      try {
        const user = await authRepository.findUserById(pool, userId);
        if (user && user.email) {
          emailService.sendAbhaOtpEmail({
            to: user.email,
            name: user.name,
            otp: result.testOtp,
            txnId: result.txnId
          }).catch(err => logger.warn({ err: err.message }, '[ABHA Service] OTP email transmission failed'));
        }
      } catch (err) {
        logger.warn({ err: err.message }, '[ABHA Service] User lookup for OTP email failed');
      }
    }

    await abhaRepository.createAuditEntry(null, {
      actorId: userId,
      action: 'ABHA_CREATE_OTP_REQUESTED',
      resourceType: 'abdm_gateway',
      resourceId: null,
      ip,
      meta: { txnId: result.txnId }
    });

    return {
      txnId: result.txnId,
      message: isSandboxTxn
        ? (result.message || 'Sandbox OTP ready. Use 123456 to continue.')
        : (result.message ||
          'OTP sent by UIDAI to the mobile number already linked with your Aadhaar (not GetMyHospital email/SMS).'),
      hint:
        result.hint ||
        (isSandboxTxn
          ? 'Sandbox: enter 123456. A copy may also arrive on your GetMyHospital Gmail.'
          : 'Check the phone registered with Aadhaar / UIDAI for the 6-digit OTP.'),
      ...(isSandboxTxn && result.testOtp ? { testOtp: result.testOtp } : {}),
      badge: getBadge()
    };
  },

  async verifyCreateOtp({ userId, txnId, otp, mobile, ip }) {
    await this._ensureActiveConsent(userId);
    const client = getAbdmClient();
    const result = await client.verifyAadhaarOtp({ txnId, otp, mobile });

    // Persist demographics returned by Eka/ABDM into the patient profile
    const profile = result.profile || {};
    if (result.verified && (profile.name || profile.gender || profile.dob || result.name)) {
      try {
        await authRepository.updatePatientProfile(pool, userId, {
          fullName: profile.name || result.name || null,
          dateOfBirth: profile.dob || result.dob || null,
          gender: normalizeGender(profile.gender || result.gender),
        });
      } catch (err) {
        logger.warn({ err: err.message }, '[ABHA] Failed to mirror Aadhaar demographics to profile');
      }
    }

    await abhaRepository.createAuditEntry(null, {
      actorId: userId,
      action: 'ABHA_CREATE_OTP_VERIFIED',
      resourceType: 'abdm_gateway',
      resourceId: null,
      ip,
      meta: { txnId: result.txnId, verified: result.verified, hasProfile: Boolean(profile.name || result.name) }
    });

    return {
      txnId: result.txnId,
      verified: result.verified,
      profile: {
        name: profile.name || result.name || null,
        gender: profile.gender || result.gender || null,
        dob: profile.dob || result.dob || null,
      },
      badge: getBadge()
    };
  },

  async getAddressSuggestions({ userId, txnId }) {
    await this._ensureActiveConsent(userId);
    const client = getAbdmClient();
    const result = await client.getAbhaAddressSuggestions({ txnId });

    return {
      txnId: result.txnId,
      suggestions: result.suggestions || [],
      allowCustom: result.allowCustom !== false,
      message: result.message || null,
      badge: getBadge()
    };
  },

  async confirmCreateAddress({ userId, txnId, abhaAddress, ip }) {
    await this._ensureActiveConsent(userId);
    const abdmClient = getAbdmClient();
    const result = await abdmClient.enrolByAddress({ txnId, abhaAddress });
    const photoUrl = await resolveAndStorePhoto(userId, result);

    const abhaNumber = result.abhaNumber;
    const abhaHash = hashAbhaNumber(abhaNumber);

    return await withTransaction(async (client) => {
      const existing = await abhaRepository.findLinkByHash(client, abhaHash);
      if (existing && existing.user_id !== userId) {
        throw new AppError('This ABHA number is already linked to another patient profile', 409, 'ABHA_ALREADY_LINKED');
      }

      const displayName = await resolveLinkDisplayName(userId, result);
      const abhaEnc = encryptAbhaNumber(abhaNumber);
      const gender = normalizeGender(result.gender || result.profile?.gender);
      const dob = result.dob || result.profile?.dob || null;
      const mobile = result.mobile || result.profile?.mobile || null;
      const maskedNumber = maskAbhaNumber(abhaNumber);
      const enriched = { ...result, name: displayName };
      const qr = buildAbhaQrBundle({
        maskedNumber,
        abhaAddress: result.abhaAddress,
        name: displayName,
        yearOfBirth: dob ? Number(String(dob).slice(0, 4)) : null,
        gender,
        mobile,
      });
      const link = await abhaRepository.upsertLink(client, {
        userId,
        abhaNumberEnc: abhaEnc,
        abhaNumberHash: abhaHash,
        abhaAddress: result.abhaAddress,
        name: displayName,
        photoUrl,
        gender,
        dateOfBirth: dob,
        mobile,
        qrPayload: qr.qrPayload,
        qrImageUrl: qr.qrImageUrl,
        meta: { source: 'create', hasPhoto: Boolean(photoUrl), hasQr: true },
      });

      await mirrorDemographics(client, userId, enriched, photoUrl);

      await abhaRepository.createAuditEntry(client, {
        actorId: userId,
        action: 'ABHA_ENROLLED_AND_LINKED',
        resourceType: 'abha_links',
        resourceId: userId,
        ip,
        meta: {
          abhaAddress: result.abhaAddress,
          gender,
          dob,
          hasPhoto: Boolean(photoUrl),
          hasQr: true,
        }
      });

      return {
        maskedNumber,
        abhaAddress: link.abha_address,
        name: link.name,
        gender,
        dob,
        mobile,
        photoUrl: photoUrl || link.photo_url || null,
        qrPayload: link.qr_payload || qr.qrPayload,
        qrImageUrl: link.qr_image_url || qr.qrImageUrl,
        status: link.status,
        verifiedAt: link.verified_at,
        badge: getBadge()
      };
    });
  },

  async initLink({ userId, abhaNumberOrAddress, ip }) {
    await this._ensureActiveConsent(userId);
    const client = getAbdmClient();
    const result = await client.initLinkOtp({ abhaNumberOrAddress });
    const isSandbox = Boolean(result.testOtp);

    // ONLY email sandbox OTP — real ABDM OTP goes to ABHA-linked mobile (never email)
    if (isSandbox && result.testOtp) {
      try {
        const user = await authRepository.findUserById(pool, userId);
        if (user && user.email) {
          emailService.sendAbhaOtpEmail({
            to: user.email,
            name: user.name,
            otp: result.testOtp,
            txnId: result.txnId
          }).catch(err => logger.warn({ err: err.message }, '[ABHA Service] Link OTP email transmission failed'));
        }
      } catch (err) {
        logger.warn({ err: err.message }, '[ABHA Service] User lookup for Link OTP email failed');
      }
    }

    await abhaRepository.createAuditEntry(null, {
      actorId: userId,
      action: 'ABHA_LINK_OTP_REQUESTED',
      resourceType: 'abdm_gateway',
      resourceId: null,
      ip,
      meta: { txnId: result.txnId, sandbox: isSandbox }
    });

    return {
      txnId: result.txnId,
      message:
        result.message ||
        result.hint ||
        'OTP sent to the mobile number linked with this ABHA (not email).',
      hint: result.hint || 'Check SMS on your ABHA-registered phone for the 6-digit code.',
      ...(isSandbox && result.testOtp ? { testOtp: result.testOtp } : {}),
      badge: getBadge()
    };
  },

  async verifyLink({ userId, txnId, otp, ip }) {
    await this._ensureActiveConsent(userId);
    const abdmClient = getAbdmClient();
    const result = await abdmClient.verifyLinkOtp({ txnId, otp });
    const photoUrl = await resolveAndStorePhoto(userId, result);

    const abhaNumber = result.abhaNumber;
    const abhaHash = hashAbhaNumber(abhaNumber);

    return await withTransaction(async (client) => {
      const existing = await abhaRepository.findLinkByHash(client, abhaHash);
      if (existing && existing.user_id !== userId) {
        throw new AppError('This ABHA number is already linked to another patient profile', 409, 'ABHA_ALREADY_LINKED');
      }

      const displayName = await resolveLinkDisplayName(userId, result);
      const abhaEnc = encryptAbhaNumber(abhaNumber);
      const gender = normalizeGender(result.gender || result.profile?.gender);
      const dob = result.dob || result.profile?.dob || null;
      const mobile = result.mobile || result.profile?.mobile || null;
      const maskedNumber = maskAbhaNumber(abhaNumber);
      const enriched = { ...result, name: displayName };
      const qr = buildAbhaQrBundle({
        maskedNumber,
        abhaAddress: result.abhaAddress,
        name: displayName,
        yearOfBirth: dob ? Number(String(dob).slice(0, 4)) : null,
        gender,
        mobile,
      });
      const link = await abhaRepository.upsertLink(client, {
        userId,
        abhaNumberEnc: abhaEnc,
        abhaNumberHash: abhaHash,
        abhaAddress: result.abhaAddress,
        name: displayName,
        photoUrl,
        gender,
        dateOfBirth: dob,
        mobile,
        qrPayload: qr.qrPayload,
        qrImageUrl: qr.qrImageUrl,
        meta: { source: 'link', hasPhoto: Boolean(photoUrl), hasQr: true },
      });

      await mirrorDemographics(client, userId, enriched, photoUrl);

      await abhaRepository.createAuditEntry(client, {
        actorId: userId,
        action: 'ABHA_LINKED',
        resourceType: 'abha_links',
        resourceId: userId,
        ip,
        meta: { abhaAddress: result.abhaAddress, hasPhoto: Boolean(photoUrl), hasQr: true }
      });

      return {
        maskedNumber,
        abhaAddress: link.abha_address,
        name: link.name,
        gender,
        dob,
        mobile,
        photoUrl: photoUrl || link.photo_url || null,
        qrPayload: link.qr_payload || qr.qrPayload,
        qrImageUrl: link.qr_image_url || qr.qrImageUrl,
        status: link.status,
        verifiedAt: link.verified_at,
        badge: getBadge()
      };
    });
  },

  async getMe(userId) {
    const link = await abhaRepository.findLinkByUserId(null, userId);
    if (!link || link.status === 'UNLINKED') {
      throw new AppError('No active ABHA linkage found for this patient', 404, 'ABHA_NOT_FOUND');
    }

    let maskedNumber = '';
    try {
      maskedNumber = maskAbhaNumber(link.abha_number_enc);
    } catch {
      maskedNumber = 'XX-XXXX-XXXX-****';
    }

    const user = await authRepository.findUserById(pool, userId);
    const dob =
      (link.date_of_birth && String(link.date_of_birth).slice(0, 10)) ||
      (user?.date_of_birth ? String(user.date_of_birth).slice(0, 10) : null);
    const yearOfBirth = dob ? Number(dob.slice(0, 4)) : null;
    const name = link.name || user?.full_name || user?.name || null;
    let photoUrl = link.photo_url || user?.abha_photo_url || null;
    // Always show a face on card/profile when ABHA is linked (KYC photo or name avatar)
    if (!photoUrl && name) {
      photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B2A5B&color=fff&size=256&bold=true`;
      // Persist so Home + profile prefer this over blank Google/missing KYC
      void authRepository.setAbhaPhoto(pool, userId, photoUrl).catch(() => {});
    }

    const gender = link.gender || user?.gender || null;
    const mobile = link.mobile || user?.mobile_phone || user?.emergency_contact_phone || null;
    let qrPayload = link.qr_payload || null;
    let qrImageUrl = link.qr_image_url || null;
    if (!qrPayload || !qrImageUrl) {
      const qr = buildAbhaQrBundle({
        maskedNumber,
        abhaAddress: link.abha_address,
        name,
        yearOfBirth,
        gender,
        mobile,
      });
      qrPayload = qr.qrPayload;
      qrImageUrl = qr.qrImageUrl;
      void abhaRepository
        .updateQr(null, userId, { qrPayload, qrImageUrl })
        .catch((err) => logger.warn({ err: err.message }, '[ABHA] QR persist failed'));
    }

    return {
      maskedNumber,
      abhaAddress: link.abha_address,
      name,
      gender,
      dob,
      yearOfBirth,
      mobile,
      photoUrl,
      qrPayload,
      qrImageUrl,
      addressLine: user?.address_line || null,
      cityName: user?.city_name || null,
      pinCode: user?.pin_code || null,
      bloodGroup: user?.blood_group || null,
      status: link.status,
      verifiedAt: link.verified_at,
      badge: getBadge()
    };
  },

  async unlink({ userId, ip }) {
    const link = await abhaRepository.findLinkByUserId(null, userId);
    if (!link || link.status === 'UNLINKED') {
      throw new AppError('No active ABHA linkage found to unlink', 404, 'ABHA_NOT_FOUND');
    }

    return await withTransaction(async (client) => {
      await abhaRepository.unlink(client, userId);
      try {
        await authRepository.setAbhaPhoto(client, userId, null);
      } catch (err) {
        logger.warn({ err: err.message }, '[ABHA] clear photo on unlink failed');
      }
      await abhaRepository.createAuditEntry(client, {
        actorId: userId,
        action: 'ABHA_UNLINKED',
        resourceType: 'abha_links',
        resourceId: userId,
        ip,
        meta: { abhaAddress: link.abha_address }
      });

      return {
        unlinked: true,
        message: 'ABHA linkage successfully unlinked and stored records purged',
        badge: getBadge()
      };
    });
  }
};

