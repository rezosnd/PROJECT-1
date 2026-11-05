/**
 * Stable public HTTPS origin for Google OAuth.
 * Never use ephemeral Vercel deployment hosts or LAN IPs — those cause
 * "Access blocked: This app's request is invalid" (redirect_uri / origin mismatch).
 */
export const GOOGLE_AUTH_PUBLIC_ORIGIN = 'https://project1-api.vercel.app';

export function resolveGoogleAuthOrigin(configured) {
  const raw = String(configured || '').trim().replace(/\/$/, '');
  if (!raw) return GOOGLE_AUTH_PUBLIC_ORIGIN;
  if (/^(https?:\/\/)?(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(raw)) {
    return GOOGLE_AUTH_PUBLIC_ORIGIN;
  }
  // Prefer production alias over *.vercel.app preview URLs
  if (/vercel\.app/i.test(raw) && !/project1-api\.vercel\.app/i.test(raw)) {
    return GOOGLE_AUTH_PUBLIC_ORIGIN;
  }
  return raw;
}
