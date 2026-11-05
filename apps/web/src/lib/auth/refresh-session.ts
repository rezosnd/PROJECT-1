import axios from 'axios';
import { getRefreshToken, setAccessToken, setRefreshToken } from './token-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://project1-api.vercel.app/api/v1';

let refreshPromise: Promise<string> | null = null;

/**
 * Single-flight refresh. Concurrent callers share one /auth/refresh request so
 * single-use refresh rotation does not revoke the whole token family.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const existingRefresh = getRefreshToken();
    if (!existingRefresh) {
      throw new Error('No refresh token');
    }

    const refreshRes = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: existingRefresh },
      { withCredentials: true }
    );

    const newAccessToken = refreshRes.data?.data?.accessToken as string | undefined;
    const newRefreshToken = refreshRes.data?.data?.refreshToken as string | undefined;
    if (!newAccessToken) {
      throw new Error('Refresh did not return access token');
    }

    setAccessToken(newAccessToken);
    if (newRefreshToken) setRefreshToken(newRefreshToken);
    return newAccessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
