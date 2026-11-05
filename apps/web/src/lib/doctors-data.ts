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

export const TOP_DOCTORS: Doctor[] = [
  {
    id: 'doc-001',
    name: 'Dr. Tripathi',
    specialty: 'General Dentist',
    specialtyType: 'tooth',
    fee: 1100.0,
    rating: 4.5,
    reviewsCount: 184,
    cardColor: '#B9F84B', // Vibrant lime green
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    heroImageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80',
    hospitalName: 'Apex Dental Care & Implant Clinic',
    hospitalAddress: 'Law Garden, Ellisbridge, Ahmedabad',
    city: 'Ahmedabad',
    phone: '+91 79 2640 1199',
    degrees: 'BDS, MDS - Oral & Maxillofacial Implantology',
    experience: '12+ Years Experience',
    latitude: 23.0238,
    longitude: 72.5645,
    mapLabel: 'Law Garden Clinic',
    about: 'Dr. Tripathi specializes in restorative dentistry, dental implants, laser periodontal treatment, and smile design with painless computerized anesthesia.',
    slots: {
      morning: ['10:00 AM', '10:45 AM', '11:30 AM'],
      evening: ['05:00 PM', '05:45 PM', '06:30 PM'],
    },
  },
  {
    id: 'doc-002',
    name: 'Dr. Shah',
    specialty: 'Cardiologist',
    specialtyType: 'heart',
    fee: 1500.0,
    rating: 4.5,
    reviewsCount: 312,
    cardColor: '#FEE244', // Warm sunflower yellow
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    heroImageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80',
    hospitalName: 'HCG Hospitals & Heart Institute',
    hospitalAddress: 'Mithakhali Six Roads, Law Garden, Ellisbridge, Ahmedabad',
    city: 'Ahmedabad',
    phone: '+91 79 4001 0200',
    degrees: 'MBBS, MD - Cardiology, FACC (USA)',
    experience: '15+ Years Experience',
    latitude: 23.0245,
    longitude: 72.5630,
    mapLabel: 'HCG Hospitals Law Garden',
    about: 'Chief Interventional Cardiologist specializing in acute coronary syndrome, complex coronary angioplasty, TAVR, and clinical cardiology with over 5,000 successful interventions.',
    slots: {
      morning: ['09:30 AM', '10:30 AM', '11:15 AM'],
      evening: ['04:30 PM', '05:30 PM', '06:15 PM'],
    },
  },
  {
    id: 'doc-003',
    name: 'Dr. Fernandes',
    specialty: 'Neurologist',
    specialtyType: 'brain',
    fee: 2300.0,
    rating: 4.5,
    reviewsCount: 228,
    cardColor: '#B9F84B', // Vibrant lime green
    avatarUrl: 'https://images.unsplash.com/photo-1594824813873-094191c4d4a8?w=400&q=80',
    heroImageUrl: 'https://images.unsplash.com/photo-1594824813873-094191c4d4a8?w=800&q=80',
    hospitalName: 'Neuro Life Institute & Brain Care',
    hospitalAddress: 'Near Gandhigram Station, Ashram Road, Ahmedabad',
    city: 'Ahmedabad',
    phone: '+91 79 2658 9012',
    degrees: 'MBBS, DM - Neurology (Gold Medalist), NIMHANS',
    experience: '11+ Years Experience',
    latitude: 23.0261,
    longitude: 72.5721,
    mapLabel: 'Gandhigram Neuro Clinic',
    about: 'Senior Neurologist with expertise in stroke management, epilepsy, Parkinson disease, migraines, neuro-rehabilitation, and emergency stroke thrombolysis.',
    slots: {
      morning: ['10:00 AM', '11:00 AM'],
      evening: ['04:00 PM', '05:00 PM', '06:00 PM'],
    },
  },
  {
    id: 'doc-004',
    name: 'Dr. Tamakuwala',
    specialty: 'Nephrologist',
    specialtyType: 'kidney',
    fee: 2000.0,
    rating: 4.5,
    reviewsCount: 195,
    cardColor: '#B9F84B', // Vibrant lime green
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80',
    heroImageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&q=80',
    hospitalName: 'Gujarat Renal Sciences & Dialysis Centre',
    hospitalAddress: 'Law Garden Cross Road, Navrangpura, Ahmedabad',
    city: 'Ahmedabad',
    phone: '+91 79 2644 4567',
    degrees: 'MBBS, MD - General Medicine, DM - Nephrology',
    experience: '16+ Years Experience',
    latitude: 23.0230,
    longitude: 72.5615,
    mapLabel: 'Renal Sciences Centre',
    about: 'Pioneering nephrologist leading renal transplantation, acute kidney injury hemodialysis, peritoneal dialysis, and chronic hypertension management.',
    slots: {
      morning: ['09:00 AM', '10:00 AM', '11:30 AM'],
      evening: ['05:30 PM', '06:30 PM'],
    },
  },
];

export function getDoctorById(id: string): Doctor {
  return TOP_DOCTORS.find((d) => d.id === id) || TOP_DOCTORS[1]; // defaults to Dr. Shah
}

