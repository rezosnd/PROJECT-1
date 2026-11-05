export interface MockHospital {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  status: 'VERIFIED' | 'PENDING';
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  emergency24x7: boolean;
  ratingAvg: number;
  totalBeds: number;
  availableBeds: number;
  specialties: string[];
  doctorName?: string;
  doctorSpecialty?: string;
  doctorFee?: number;
  doctorRating?: number;
  doctorAvatar?: string;
  doctorHeroImage?: string;
  specialtyType?: 'tooth' | 'heart' | 'brain' | 'kidney' | 'activity';
  cardColor?: string;
}

export interface MockCondition {
  id: string;
  name: string;
  slug: string;
  primaryBedType: string;
  urgencyLevel: number;
  aliases: string[];
  description: string;
  requiredEquipment: string[];
}

export interface MockWardInventory {
  id: string;
  hospitalId: string;
  wardType: 'ICU' | 'NICU' | 'PICU' | 'HDU' | 'CCU' | 'GENERAL' | 'PRIVATE' | 'EMERGENCY' | 'ISOLATION';
  total: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  maintenance: number;
  hasVentilatorBeds: number;
  free: number;
  version: number;
  updatedAt: string;
}

export interface MockEquipment {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';
  inUse: boolean;
  availableAt: string | null;
}

export interface MockBedRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  patientId: string;
  patientName: string;
  wardType: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
  status: 'HOLD' | 'APPROVED' | 'ADMITTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  holdExpiresAt: string;
  createdAt: string;
  note?: string;
  shareAbha: boolean;
  maskedAbha?: string;
}

export const mockConditions: MockCondition[] = [
  {
    id: 'cond-1',
    name: 'Acute Ischemic Stroke',
    slug: 'stroke',
    primaryBedType: 'ICU',
    urgencyLevel: 5,
    aliases: ['stroke', 'brain attack', 'paralysis', 'hemiplegia', 'cva'],
    description: 'Rapid neurological onset requiring neuro ICU and urgent CT angiography.',
    requiredEquipment: ['CT', 'MRI'],
  },
  {
    id: 'cond-2',
    name: 'Premature Neonate / Respiratory Distress',
    slug: 'premature-baby',
    primaryBedType: 'NICU',
    urgencyLevel: 5,
    aliases: ['preterm baby', 'premature infant', 'incubator need', 'neonatal sepsis'],
    description: 'Preterm birth requiring neonatal intensive care and radiant warming.',
    requiredEquipment: ['INCUBATOR', 'VENTILATOR'],
  },
  {
    id: 'cond-3',
    name: 'Dengue Hemorrhagic Shock',
    slug: 'dengue',
    primaryBedType: 'HDU',
    urgencyLevel: 4,
    aliases: ['dengue shock', 'low platelets', 'thrombocytopenia', 'dengue fever'],
    description: 'Severe platelet crash requiring continuous high-dependency hemodynamic monitoring.',
    requiredEquipment: [],
  },
  {
    id: 'cond-4',
    name: 'Acute Myocardial Infarction (STEMI)',
    slug: 'heart-attack',
    primaryBedType: 'CCU',
    urgencyLevel: 5,
    aliases: ['heart attack', 'cardiac arrest', 'chest pain', 'stemi', 'infarction'],
    description: 'Acute coronary syndrome requiring immediate coronary care unit admission.',
    requiredEquipment: ['VENTILATOR'],
  },
  {
    id: 'cond-5',
    name: 'Severe Poly-Trauma / Road Accident',
    slug: 'trauma',
    primaryBedType: 'EMERGENCY',
    urgencyLevel: 5,
    aliases: ['accident', 'rto', 'fracture', 'head injury', 'trauma'],
    description: 'Major blunt trauma requiring resuscitation bay, emergency OT and radiological imaging.',
    requiredEquipment: ['OT', 'CT', 'XRAY'],
  },
  {
    id: 'cond-6',
    name: 'Pediatric Pneumonia & Sepsis',
    slug: 'pediatric-sepsis',
    primaryBedType: 'PICU',
    urgencyLevel: 4,
    aliases: ['child pneumonia', 'baby breathlessness', 'pediatric icu'],
    description: 'Critically ill child requiring pediatric intensive care unit and oxygen support.',
    requiredEquipment: ['VENTILATOR'],
  },
];

export const mockHospitals: MockHospital[] = [
  {
    id: 'hosp-001',
    name: 'AIIMS Bhubaneswar',
    type: 'PUBLIC',
    status: 'VERIFIED',
    address: 'Sijua, Patrapada, Bhubaneswar, Odisha 751019',
    phone: '0674-2476789',
    latitude: 20.2289,
    longitude: 85.7766,
    emergency24x7: true,
    ratingAvg: 4.8,
    totalBeds: 210,
    availableBeds: 28,
    specialties: ['Neurology', 'Cardiology', 'Trauma Surgery', 'Pediatrics', 'Critical Care'],
    doctorName: 'Dr. Tripathi',
    doctorSpecialty: 'General Dentist',
    doctorFee: 1100.00,
    doctorRating: 4.8,
    specialtyType: 'tooth',
    cardColor: '#B4F481',
    doctorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80',
    doctorHeroImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80',
  },
  {
    id: 'hosp-002',
    name: 'SUM Ultimate Medicare',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'K8 Kalinga Nagar, Ghatikia, Bhubaneswar 751003',
    phone: '0674-2950500',
    latitude: 20.2862,
    longitude: 85.7744,
    emergency24x7: true,
    ratingAvg: 4.7,
    totalBeds: 180,
    availableBeds: 34,
    specialties: ['Cardiology', 'Nephrology', 'Pulmonology', 'Critical Care'],
    doctorName: 'Dr. Shah',
    doctorSpecialty: 'Cardiologist',
    doctorFee: 1500.00,
    doctorRating: 4.7,
    specialtyType: 'heart',
    cardColor: '#FCE354',
    doctorAvatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80',
    doctorHeroImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80',
  },
  {
    id: 'hosp-003',
    name: 'KIMS Hospital',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'KIIT Road, Patia, Bhubaneswar 751024',
    phone: '0674-2725472',
    latitude: 20.3541,
    longitude: 85.8178,
    emergency24x7: true,
    ratingAvg: 4.6,
    totalBeds: 240,
    availableBeds: 42,
    specialties: ['Emergency Medicine', 'Pediatrics', 'Neurosurgery', 'Neonatology'],
    doctorName: 'Dr. Fernandes',
    doctorSpecialty: 'Neurologist',
    doctorFee: 2300.00,
    doctorRating: 4.9,
    specialtyType: 'brain',
    cardColor: '#B4F481',
    doctorAvatar: 'https://images.unsplash.com/photo-1594824813583-057022064166?w=300&q=80',
    doctorHeroImage: 'https://images.unsplash.com/photo-1594824813583-057022064166?w=800&q=80',
  },
  {
    id: 'hosp-004',
    name: 'Apollo Hospitals Bhubaneswar',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'Old Sainik School Road, Samantarapur, Bhubaneswar 751005',
    phone: '0674-6661066',
    latitude: 20.3089,
    longitude: 85.8277,
    emergency24x7: true,
    ratingAvg: 4.7,
    totalBeds: 150,
    availableBeds: 19,
    specialties: ['Cardiac Care', 'Neuro ICU', 'Organ Transplant'],
    doctorName: 'Dr. Tamakuwala',
    doctorSpecialty: 'Nephrologist',
    doctorFee: 2000.00,
    doctorRating: 4.6,
    specialtyType: 'kidney',
    cardColor: '#B4F481',
    doctorAvatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80',
    doctorHeroImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&q=80',
  },
  {
    id: 'hosp-005',
    name: 'Capital Hospital',
    type: 'PUBLIC',
    status: 'VERIFIED',
    address: 'Unit 6, Ganga Nagar, Bhubaneswar 751001',
    phone: '0674-2391983',
    latitude: 20.2644,
    longitude: 85.8281,
    emergency24x7: true,
    ratingAvg: 4.2,
    totalBeds: 190,
    availableBeds: 22,
    specialties: ['General Emergency', 'Maternal Health', 'Trauma'],
    doctorName: 'Dr. K. Patnaik',
    doctorSpecialty: 'Emergency Physician',
    doctorFee: 800.00,
    doctorRating: 4.5,
    specialtyType: 'activity',
    cardColor: '#FCE354',
    doctorAvatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&q=80',
    doctorHeroImage: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&q=80',
  },
];

export const mockWards: MockWardInventory[] = [
  // AIIMS (hosp-001)
  { id: 'w-101', hospitalId: 'hosp-001', wardType: 'ICU', total: 40, occupied: 35, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 25, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-102', hospitalId: 'hosp-001', wardType: 'NICU', total: 20, occupied: 16, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 10, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-103', hospitalId: 'hosp-001', wardType: 'PICU', total: 15, occupied: 12, reserved: 0, cleaning: 1, maintenance: 0, hasVentilatorBeds: 8, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-104', hospitalId: 'hosp-001', wardType: 'HDU', total: 25, occupied: 20, reserved: 2, cleaning: 0, maintenance: 1, hasVentilatorBeds: 6, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-105', hospitalId: 'hosp-001', wardType: 'CCU', total: 20, occupied: 18, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 8, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-106', hospitalId: 'hosp-001', wardType: 'EMERGENCY', total: 10, occupied: 8, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 1, version: 1, updatedAt: new Date().toISOString() },

  // SUM (hosp-002)
  { id: 'w-201', hospitalId: 'hosp-002', wardType: 'ICU', total: 35, occupied: 28, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 20, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-202', hospitalId: 'hosp-002', wardType: 'NICU', total: 15, occupied: 11, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 8, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-203', hospitalId: 'hosp-002', wardType: 'HDU', total: 25, occupied: 19, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 5, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-204', hospitalId: 'hosp-002', wardType: 'CCU', total: 20, occupied: 16, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 6, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-205', hospitalId: 'hosp-002', wardType: 'EMERGENCY', total: 10, occupied: 6, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 3, version: 1, updatedAt: new Date().toISOString() },

  // KIMS (hosp-003)
  { id: 'w-301', hospitalId: 'hosp-003', wardType: 'ICU', total: 50, occupied: 38, reserved: 4, cleaning: 2, maintenance: 1, hasVentilatorBeds: 30, free: 5, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-302', hospitalId: 'hosp-003', wardType: 'NICU', total: 25, occupied: 19, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 12, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-303', hospitalId: 'hosp-003', wardType: 'HDU', total: 30, occupied: 22, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 8, free: 5, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-304', hospitalId: 'hosp-003', wardType: 'CCU', total: 25, occupied: 20, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 10, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-305', hospitalId: 'hosp-003', wardType: 'EMERGENCY', total: 15, occupied: 10, reserved: 2, cleaning: 0, maintenance: 0, hasVentilatorBeds: 6, free: 3, version: 1, updatedAt: new Date().toISOString() },
];

export const mockEquipmentList: MockEquipment[] = [
  { id: 'eq-101', hospitalId: 'hosp-001', name: '3T MRI Scanner A', type: 'MRI', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 45 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { id: 'eq-102', hospitalId: 'hosp-001', name: '128-Slice CT Scanner', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-103', hospitalId: 'hosp-001', name: 'Servo ICU Ventilator 1', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 120 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { id: 'eq-104', hospitalId: 'hosp-001', name: 'Servo ICU Ventilator 2', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-105', hospitalId: 'hosp-001', name: 'Fresenius Dialysis Unit', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-106', hospitalId: 'hosp-001', name: 'Giraffe Neonatal Incubator', type: 'INCUBATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },

  { id: 'eq-201', hospitalId: 'hosp-002', name: 'Signa 1.5T MRI', type: 'MRI', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-202', hospitalId: 'hosp-002', name: '64-Slice Cardiac CT', type: 'CT', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { id: 'eq-203', hospitalId: 'hosp-002', name: 'Dialysis Bay 1', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-204', hospitalId: 'hosp-002', name: 'Drager Neonatal Warmer', type: 'INCUBATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },

  { id: 'eq-301', hospitalId: 'hosp-003', name: 'Siemens 3T Vida MRI', type: 'MRI', status: 'MAINTENANCE', inUse: false, availableAt: null },
  { id: 'eq-302', hospitalId: 'hosp-003', name: 'Somatom CT Scanner', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-303', hospitalId: 'hosp-003', name: 'Puritan Bennett Ventilator', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
];

export const mockBedRequests: MockBedRequest[] = [
  {
    id: 'req-001',
    hospitalId: 'hosp-001',
    hospitalName: 'AIIMS Bhubaneswar',
    patientId: 'usr-patient-1',
    patientName: 'Subhashree Nayak',
    wardType: 'ICU',
    urgency: 'IMMEDIATE',
    status: 'HOLD',
    holdExpiresAt: new Date(Date.now() + 12 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    note: 'Acute stroke symptoms, transfer from Patrapada.',
    shareAbha: true,
    maskedAbha: '91-8843-1290-4412',
  },
];

