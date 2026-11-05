import { create } from 'zustand';
import { apiClient } from '../api/client';
import {
  setAccessToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from './token-store';

export type UserRole = 'PATIENT' | 'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN' | 'CITY_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string | null;
  abhaPhotoUrl?: string | null;
  googlePictureUrl?: string | null;
  role: UserRole;
  hospitalId?: string | null;
  profileComplete?: boolean;
  needsProfileSetup?: boolean;
  profile?: Record<string, any> | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null, accessToken?: string | null, refreshToken?: string | null) => void;
  loginWithGoogleCredential: (
    idToken: string,
    options?: { requestedRole?: UserRole; hospitalId?: string | null }
  ) => Promise<void>;
  loginWithCustomCredentials: (params: {
    email: string;
    name?: string;
    role?: UserRole;
    hospitalId?: string | null;
  }) => Promise<void>;
  loginAsMockRole: (role: UserRole, customHospitalId?: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user, accessToken, refreshToken) => {
    if (user && accessToken) {
      setTokens(accessToken, refreshToken ?? getRefreshToken());
    } else if (!user) {
      clearTokens();
    } else if (accessToken) {
      setAccessToken(accessToken);
      if (refreshToken) setRefreshToken(refreshToken);
    }
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      error: null,
    });
  },

  loginWithGoogleCredential: async (idToken, options) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/auth/google', {
        idToken,
        clientType: 'web',
        requestedRole: options?.requestedRole,
        hospitalId: options?.hospitalId,
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken || null);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      clearTokens();
      const message = err.response?.data?.error?.message || 'Google authentication failed';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  loginWithCustomCredentials: async () => {
    const message = 'Demo email login is disabled. Sign in with Google.';
    set({ isLoading: false, error: message });
    throw new Error(message);
  },

  loginAsMockRole: async () => {
    const message = 'Demo role login is disabled. Sign in with your real Google account.';
    set({ isLoading: false, error: message });
    throw new Error(message);
  },

  checkSession: async () => {
    try {
      if (!getAccessToken()) {
        const refresh = getRefreshToken();
        if (!refresh) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        try {
          const refreshRes = await apiClient.post('/auth/refresh', { refreshToken: refresh });
          const token = refreshRes.data?.data?.accessToken;
          const nextRefresh = refreshRes.data?.data?.refreshToken;
          if (token) setTokens(token, nextRefresh || refresh);
          else {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
      }

      if (getAccessToken()) {
        const meRes = await apiClient.get('/auth/users/me');
        const user = meRes.data?.data?.user || meRes.data?.data;
        if (user?.id) {
          set({ user, isAuthenticated: true, isLoading: false });
          return;
        }
      }

      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      const refreshToken = getRefreshToken();
      await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      /* ignore */
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },
}));
