/**
 * Access token: memory only (XSS-hardened).
 * Refresh token: sessionStorage so silent refresh works across short ABHA OTP flows
 * without requiring httpOnly cookies (API currently returns refresh in JSON body).
 */

const REFRESH_KEY = 'lifelink_refresh_token';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

function readStoredRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeStoredRefresh(token: string | null) {
  try {
    if (token) sessionStorage.setItem(REFRESH_KEY, token);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getRefreshToken(): string | null {
  return inMemoryRefreshToken || readStoredRefresh();
}

export function setRefreshToken(token: string | null) {
  inMemoryRefreshToken = token;
  writeStoredRefresh(token);
}

export function setTokens(accessToken: string | null, refreshToken?: string | null) {
  setAccessToken(accessToken);
  if (typeof refreshToken !== 'undefined') {
    setRefreshToken(refreshToken);
  }
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
}

export function clearTokens() {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  writeStoredRefresh(null);
}
