import { create } from 'zustand';

export type FlashTone = 'success' | 'info' | 'warn';

export interface FlashMessage {
  id: string;
  title: string;
  body?: string;
  tone: FlashTone;
  createdAt: number;
}

interface FlashState {
  message: FlashMessage | null;
  push: (input: { title: string; body?: string; tone?: FlashTone }) => void;
  clear: () => void;
}

export const useFlashStore = create<FlashState>((set) => ({
  message: null,
  push: ({ title, body, tone = 'success' }) =>
    set({
      message: {
        id: `${Date.now()}`,
        title,
        body,
        tone,
        createdAt: Date.now(),
      },
    }),
  clear: () => set({ message: null }),
}));
