import crypto from 'node:crypto';
import { config } from '../../config/index.js';

function getEncryptionKey() {
  const key = Buffer.from(config.ABHA_ENC_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('ABHA_ENC_KEY must decode to exactly 32 bytes for AES-256-GCM encryption');
  }
  return key;
}

/**
 * Encrypt a plain ABHA number using AES-256-GCM.
 * Packs IV (12 bytes), Auth Tag (16 bytes), and Ciphertext into a single contiguous Buffer.
 * 
 * @param {string} plainAbha
 * @returns {Buffer} Packed binary buffer for BYTEA storage
 */
export function encryptAbhaNumber(plainAbha) {
  if (!plainAbha || typeof plainAbha !== 'string') {
    throw new Error('Plain ABHA number string is required for encryption');
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plainAbha.trim(), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a packed AES-256-GCM buffer back to the plain ABHA number.
 * 
 * @param {Buffer|Uint8Array|string} packedBuffer
 * @returns {string} Plain ABHA number
 */
export function decryptAbhaNumber(packedBuffer) {
  if (!packedBuffer) return '';
  const buf = Buffer.isBuffer(packedBuffer) ? packedBuffer : Buffer.from(packedBuffer);
  if (buf.length < 28) {
    throw new Error('Invalid encrypted ABHA payload: buffer too short');
  }

  const key = getEncryptionKey();
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
  return decrypted;
}

/**
 * Computes deterministic SHA-256 hash of normalized ABHA number for uniqueness checks.
 * Strips all non-digit characters so formatting variants match identical identities.
 * 
 * @param {string} plainAbha
 * @returns {string} 64-char hex hash
 */
export function hashAbhaNumber(plainAbha) {
  if (!plainAbha) return '';
  const normalized = String(plainAbha).replace(/\D/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Masks an ABHA number in official ABDM standard format: XX-XXXX-XXXX-${last4}.
 * Accepts either a plain ABHA string or an encrypted Buffer.
 * 
 * @param {string|Buffer} plainOrEncrypted
 * @returns {string} Masked ABHA number
 */
export function maskAbhaNumber(plainOrEncrypted) {
  if (!plainOrEncrypted) return '';
  let plain = '';
  if (Buffer.isBuffer(plainOrEncrypted)) {
    plain = decryptAbhaNumber(plainOrEncrypted);
  } else {
    plain = String(plainOrEncrypted);
  }

  const digits = plain.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '0000';
  return `XX-XXXX-XXXX-${last4}`;
}

