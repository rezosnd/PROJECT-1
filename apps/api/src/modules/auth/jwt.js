import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';

/**
 * Generate Access JWT (Short-lived: 15 minutes)
 * Claims: sub, role, hospitalId?, jti, iat, exp
 */
export function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    jti: crypto.randomUUID()
  };

  // Only include hospitalId claim if present (strictly adhering to hospitalId? specification)
  if (user.hospital_id) {
    payload.hospitalId = user.hospital_id;
  }

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY
  });
}

/**
 * Generate cryptographically secure random Refresh Token (Long-lived: 7 days)
 */
export function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Hash refresh token using SHA-256 before persisting in PostgreSQL
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid access token signature', 401, 'INVALID_TOKEN');
  }
}

