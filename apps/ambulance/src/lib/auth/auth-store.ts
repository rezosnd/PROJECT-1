import { create } from 'zustand';
import axios from 'axios';
import Constants from 'expo-constants';
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  saveUserIdentity,
  getUserIdentity,
} from '../storage/secure-store';

export interface AmbulanceUser {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string | null;
  role: string;
  hospitalId?: string | null;
}

interface AuthState {
  user: AmbulanceUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AmbulanceUser | null, access?: string, refresh?: string) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || 'https://project1-api.vercel.app/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

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

  loginWithGoogleIdToken: async (idToken: string) => {
    const res = await axios.post(`${API_URL}/auth/google`, {
      idToken,
      clientType: 'web',
      requestedRole: 'AMBULANCE',
    });
    const { user, accessToken, refreshToken } = res.data.data;
    if (user.role !== 'AMBULANCE') {
      await clearTokens();
      throw new Error(
        'This Google account is not registered as an ambulance operator. Ask your Hospital Admin to add your Gmail under Ambulance Access, then sign in here again.'
      );
    }
    await get().setUser(user, accessToken, refreshToken);
  },

  checkSession: async () => {
    try {
      const token = await getAccessToken();
      const cached = await getUserIdentity();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      if (cached) {
        const parsed = JSON.parse(cached);
        set({ user: parsed, isAuthenticated: true });
      }
      const res = await axios.get(`${API_URL}/auth/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = res.data.data;
      if (user.role !== 'AMBULANCE') {
        await clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      await saveUserIdentity(JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
