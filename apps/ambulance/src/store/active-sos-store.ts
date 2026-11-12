import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'gmh_amb_active_sos';

interface ActiveSosState {
  sosId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveSos: (id: string | null) => Promise<void>;
}

export const useActiveSosStore = create<ActiveSosState>((set) => ({
  sosId: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const id = await SecureStore.getItemAsync(KEY);
      set({ sosId: id, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setActiveSos: async (id) => {
    if (id) await SecureStore.setItemAsync(KEY, id);
    else await SecureStore.deleteItemAsync(KEY);
    set({ sosId: id });
  },
}));
