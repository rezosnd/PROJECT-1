import { create } from 'zustand';
import type { ScannedPatient } from '../lib/api/referrals.api';

interface ScannedPatientState {
  patient: ScannedPatient | null;
  setPatient: (patient: ScannedPatient | null) => void;
  getById: (id: string) => ScannedPatient | null;
}

export const useScannedPatientStore = create<ScannedPatientState>((set, get) => ({
  patient: null,
  setPatient: (patient) => set({ patient }),
  getById: (id) => {
    const p = get().patient;
    return p && p.id === id ? p : null;
  },
}));
