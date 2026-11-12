import type { DirectoryDoctor } from './api/insurance.api';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  specialtyType: 'tooth' | 'heart' | 'brain' | 'kidney';
  fee: number;
  rating: number;
  reviewsCount: number;
  cardColor: string;
  avatarUrl: string;
  heroImageUrl: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  phone: string;
  degrees: string;
  experience: string;
  latitude: number;
  longitude: number;
  mapLabel: string;
  about: string;
  slots: {
    morning: string[];
    evening: string[];
  };
}

const COLORS = ['#B9F84B', '#FEE244', '#B4F481', '#FCE354'];

function specialtyType(specialty: string): Doctor['specialtyType'] {
  const s = (specialty || '').toLowerCase();
  if (s.includes('cardio') || s.includes('heart')) return 'heart';
  if (s.includes('neuro') || s.includes('brain')) return 'brain';
  if (s.includes('nephro') || s.includes('kidney')) return 'kidney';
  if (s.includes('dent')) return 'tooth';
  return 'heart';
}

export function mapDirectoryDoctor(d: DirectoryDoctor, index = 0): Doctor {
  const photo =
    d.pictureUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'Doctor')}&background=0B3D1A&color=A8E017`;
  return {
    id: d.id,
    name: d.name,
    specialty: d.specialty || 'General Medicine',
    specialtyType: specialtyType(d.specialty || ''),
    fee: 0,
    rating: d.ratingAvg != null ? Number(d.ratingAvg) : 4.5,
    reviewsCount: 0,
    cardColor: COLORS[index % COLORS.length],
    avatarUrl: photo,
    heroImageUrl: photo,
    hospitalName: d.hospitalName || 'Affiliated hospital',
    hospitalAddress: d.hospitalAddress || '',
    city: d.city || 'Bhubaneswar',
    phone: d.phone || '',
    degrees: 'Registered practitioner',
    experience: 'On GetMyHospital doctor network',
    latitude: d.latitude != null ? Number(d.latitude) : 20.2961,
    longitude: d.longitude != null ? Number(d.longitude) : 85.8245,
    mapLabel: d.hospitalName || 'Hospital',
    about: `${d.name} is a ${d.specialty || 'clinician'} on the GetMyHospital network.`,
    slots: { morning: [], evening: [] },
  };
}

export const TOP_DOCTORS: Doctor[] = [];

/** Prefer live API doctors; falls back only when directory is empty. */
export function getDoctorById(id: string, directory: Doctor[] = []): Doctor | null {
  return directory.find((d) => d.id === id) || null;
}
