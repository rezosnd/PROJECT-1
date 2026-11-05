import { create } from 'zustand';
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  saveUserIdentity,
  getUserIdentity,
  saveAccount,
} from '../storage/secure-store';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

export interface RegisterUserParams {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string | null;
  hospitalName?: string;
  bloodGroup?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricLockEnabled: boolean;
  setBiometricLock: (enabled: boolean) => void;
  setUser: (user: AuthUser | null, accessToken?: string, refreshToken?: string) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string, requestedRole?: UserRole, hospitalId?: string) => Promise<void>;
  signInWithGoogle: (params?: { requestedRole?: UserRole; hospitalId?: string }) => Promise<void>;
  loginWithCustomCredentials: (params: { email: string; name?: string; role?: UserRole; hospitalId?: string }) => Promise<void>;
  registerOrLoginUser: (params: RegisterUserParams) => Promise<void>;
  loginAsCitizen: () => Promise<void>;
  loginAsStaff: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.5.114.133:5000/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometricLockEnabled: false,

  setBiometricLock: (enabled: boolean) => {
    set({ biometricLockEnabled: enabled });
  },

  setUser: async (user, accessToken, refreshToken) => {
    if (user && accessToken) {
      await saveTokens(accessToken, refreshToken);
      await saveUserIdentity(JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loginWithGoogleIdToken: async (idToken: string, requestedRole: UserRole = 'PATIENT', hospitalId?: string) => {
    set({ isLoading: true });
    try {
      // Bridge page uses WEB Google client — verify against web audience
      const res = await axios.post(`${API_URL}/auth/google`, {
        idToken,
        clientType: 'web',
        requestedRole,
        hospitalId,
      });
      const { user, accessToken, refreshToken } = res.data.data;
      await get().setUser(user, accessToken, refreshToken);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signInWithGoogle: async () => {
    throw new Error('Use the Sign in with Google button — demo Google accounts are disabled.');
  },

  loginWithCustomCredentials: async () => {
    throw new Error('Demo email login is disabled. Sign in with a real Google account.');
  },

  registerOrLoginUser: async () => {
    throw new Error('Demo registration is disabled. Sign in with Google.');
  },

  loginAsCitizen: async () => {
    throw new Error('Demo citizen login is disabled. Sign in with Google.');
  },

  loginAsStaff: async () => {
    throw new Error('Staff sign-in is on the LifeLink web portal with a pre-registered Gmail.');
  },



  checkSession: async () => {
    try {
      const token = await getAccessToken();
      const storedUser = await getUserIdentity();
      if (token && storedUser) {
        set({ user: JSON.parse(storedUser), isAuthenticated: true, isLoading: false });
        // Refresh from API so profileComplete stays accurate
        try {
          const res = await axios.get(`${API_URL}/auth/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
          });
          const fresh = res.data.data;
          await get().setUser(fresh, token);
        } catch {
          // keep cached identity if offline
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshCurrentUser: async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await axios.get(`${API_URL}/auth/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await get().setUser(res.data.data, token);
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
