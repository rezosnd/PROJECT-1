import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../storage/secure-store';
import { generateUUID } from '../utils/uuid';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || 'https://project1-api.vercel.app/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  if (config.headers && !config.headers['x-trace-id']) {
    config.headers['x-trace-id'] = generateUUID();
  }
  return config;
});

let refreshing = false;
let queue: Array<{ resolve: (t?: string) => void; reject: (e: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject })).then((token) => {
          if (original.headers) original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }
      original._retry = true;
      refreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        await saveTokens(accessToken);
        queue.forEach((p) => p.resolve(accessToken));
        queue = [];
        if (original.headers) original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (e) {
        queue.forEach((p) => p.reject(e));
        queue = [];
        await clearTokens();
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
