import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, clearTokens } from '../auth/token-store';
import { refreshAccessToken } from '../auth/refresh-session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://project1-api.vercel.app/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.headers && !config.headers['x-trace-id']) {
    config.headers['x-trace-id'] =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `trace-${Date.now()}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/google')
      ) {
        clearTokens();
        return Promise.reject(error);
      }

      if (!getRefreshToken()) {
        clearTokens();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Only wipe session if refresh still points at the failed token family.
        // A parallel success may have already rotated tokens.
        if (!getAccessToken()) {
          clearTokens();
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
