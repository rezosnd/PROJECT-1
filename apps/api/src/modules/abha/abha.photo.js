import { cloudinaryService } from '../../infra/cloudinary.js';
import { logger } from '../../infra/logger.js';

/**
 * Pull ABHA / Aadhaar face photo from Eka/ABDM response shapes.
 * Often arrives as base64 (with or without data: prefix) or as an https URL.
 */
export function extractAbhaPhoto(payload = {}) {
  const profile =
    payload.profile ||
    payload.abha_profile ||
    (Array.isArray(payload.abha_profiles) ? payload.abha_profiles[0] : null) ||
    payload;

  const candidates = [
    profile?.photo,
    profile?.Photo,
    profile?.profilePhoto,
    profile?.profile_photo,
    profile?.kycPhoto,
    profile?.kyc_photo,
    profile?.facePhoto,
    profile?.face_photo,
    profile?.image,
    profile?.picture,
    profile?.avatar,
    payload?.photo,
    payload?.profilePhoto,
    payload?.profile_photo,
    payload?.kycPhoto,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value) continue;
    if (/^https?:\/\//i.test(value)) return { kind: 'url', value };
    if (value.startsWith('data:image')) return { kind: 'data', value };
    // bare base64
    if (value.length > 80 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 120))) {
      return { kind: 'data', value: `data:image/jpeg;base64,${value.replace(/\s+/g, '')}` };
    }
  }
  return null;
}

/**
 * Persist ABHA photo to Cloudinary; returns HTTPS URL or null.
 */
export async function persistAbhaPhoto({ userId, photo }) {
  if (!photo?.value) return null;
  if (photo.kind === 'url') return photo.value;

  try {
    const uploaded = await cloudinaryService.uploadHospitalPhoto({
      hospitalId: `abha_${userId}`,
      image: photo.value,
      folder: 'lifelink/abha-photos',
    });
    return uploaded?.url || null;
  } catch (err) {
    logger.warn({ err: err.message, userId }, '[ABHA] Photo upload failed — keeping demographics only');
    // Fall back to data URI so mobile can still render immediately
    if (photo.kind === 'data' && photo.value.length < 400_000) {
      return photo.value;
    }
    return null;
  }
}
