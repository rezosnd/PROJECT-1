export interface MockHospital {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  emergencyPhone: string;
  totalBeds: number;
  availableBeds: number;
}

export interface MockCondition {
  id: string;
  name: string;
  slug: string;
  primaryBedType: string;
  urgencyLevel: number;
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
  patientId: string;
  patientName: string;
  bedType: string;
  severity: number;
  status: 'HOLD' | 'ADMITTED' | 'REJECTED' | 'EXPIRED';
  holdExpiresAt: string;
  createdAt: string;
}

export const mockConditions: MockCondition[] = [
  {
    id: 'cond-1',
    name: 'Acute Ischemic Stroke',
    slug: 'stroke',
    primaryBedType: 'ICU',
    urgencyLevel: 5,
    description: 'Rapid neurological onset requiring immediate neurological ICU and CT angiography',
    requiredEquipment: ['CT', 'MRI'],
  },
  {
    id: 'cond-2',
    name: 'Premature Neonate / Respiratory Distress',
    slug: 'premature-baby',
    primaryBedType: 'NICU',
    urgencyLevel: 5,
    description: 'Preterm birth requiring specialized neonatal intensive care and radiant warming',
    requiredEquipment: ['INCUBATOR', 'VENTILATOR'],
  },
  {
    id: 'cond-3',
    name: 'Dengue with Hemorrhagic Shock / Platelet Drop',
    slug: 'dengue',
    primaryBedType: 'HDU',
    urgencyLevel: 4,
    description: 'Severe thrombocytopenia requiring high-dependency hemodynamic monitoring',
    requiredEquipment: [],
  },
  {
    id: 'cond-4',
    name: 'Acute Myocardial Infarction (STEMI)',
    slug: 'heart-attack',
    primaryBedType: 'CCU',
    urgencyLevel: 5,
    description: 'Acute coronary syndrome requiring cardiac coronary intensive care',
    requiredEquipment: ['VENTILATOR'],
  },
  {
    id: 'cond-5',
    name: 'Severe Poly-Trauma / Road Accident',
    slug: 'trauma',
    primaryBedType: 'EMERGENCY',
    urgencyLevel: 5,
    description: 'Major blunt trauma requiring trauma bay, emergency OT and radiological imaging',
    requiredEquipment: ['OT', 'CT', 'XRAY'],
  },
  {
    id: 'cond-6',
    name: 'Acute Respiratory Distress Syndrome (ARDS)',
    slug: 'respiratory-failure',
    primaryBedType: 'ICU',
    urgencyLevel: 5,
    description: 'Severe hypoxic failure requiring mechanical ventilation and ICU care',
    requiredEquipment: ['VENTILATOR'],
  },
  {
    id: 'cond-7',
    name: 'Pediatric Severe Sepsis',
    slug: 'pediatric-sepsis',
    primaryBedType: 'PICU',
    urgencyLevel: 4,
    description: 'Critically ill child needing pediatric intensive care unit',
    requiredEquipment: ['VENTILATOR'],
  },
  {
    id: 'cond-8',
    name: 'Severe End-Stage Renal Emergency',
    slug: 'renal-failure',
    primaryBedType: 'HDU',
    urgencyLevel: 4,
    description: 'Hyperkalemia or uremic overload requiring immediate hemodialysis',
    requiredEquipment: ['DIALYSIS'],
  },
  {
    id: 'cond-9',
    name: 'Airborne Infectious Disease / Tuberculosis',
    slug: 'isolation-infection',
    primaryBedType: 'ISOLATION',
    urgencyLevel: 3,
    description: 'Negative pressure room required for containment',
    requiredEquipment: [],
  },
  {
    id: 'cond-10',
    name: 'Post-Operative Acute Inpatient Care',
    slug: 'general-surgery',
    primaryBedType: 'GENERAL',
    urgencyLevel: 2,
    description: 'Standard surgical ward bed for scheduled recovery',
    requiredEquipment: ['OT'],
  },
];

export const mockHospitals: MockHospital[] = [
  {
    id: 'hosp-001',
    name: 'AIIMS Bhubaneswar',
    type: 'PUBLIC',
    status: 'VERIFIED',
    address: 'Sijua, Patrapada, Bhubaneswar, Odisha 751019',
    city: 'Bhubaneswar',
    pincode: '751019',
    latitude: 20.2289,
    longitude: 85.7766,
    emergencyPhone: '0674-2476789',
    totalBeds: 210,
    availableBeds: 28,
  },
  {
    id: 'hosp-002',
    name: 'SUM Ultimate Medicare',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'K8 Kalinga Nagar, Ghatikia, Bhubaneswar, Odisha 751003',
    city: 'Bhubaneswar',
    pincode: '751003',
    latitude: 20.2862,
    longitude: 85.7744,
    emergencyPhone: '0674-2950500',
    totalBeds: 180,
    availableBeds: 34,
  },
  {
    id: 'hosp-003',
    name: 'KIMS Hospital',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'KIIT Road, Patia, Bhubaneswar, Odisha 751024',
    city: 'Bhubaneswar',
    pincode: '751024',
    latitude: 20.3541,
    longitude: 85.8178,
    emergencyPhone: '0674-2725472',
    totalBeds: 240,
    availableBeds: 42,
  },
  {
    id: 'hosp-004',
    name: 'Apollo Hospitals Bhubaneswar',
    type: 'PRIVATE',
    status: 'VERIFIED',
    address: 'Old Sainik School Road, Samantarapur, Bhubaneswar 751005',
    city: 'Bhubaneswar',
    pincode: '751005',
    latitude: 20.3089,
    longitude: 85.8277,
    emergencyPhone: '0674-6661066',
    totalBeds: 150,
    availableBeds: 19,
  },
  {
    id: 'hosp-005',
    name: 'Capital Hospital',
    type: 'PUBLIC',
    status: 'VERIFIED',
    address: 'Unit 6, Ganga Nagar, Bhubaneswar, Odisha 751001',
    city: 'Bhubaneswar',
    pincode: '751001',
    latitude: 20.2644,
    longitude: 85.8281,
    emergencyPhone: '0674-2391983',
    totalBeds: 190,
    availableBeds: 22,
  },
  {
    id: 'hosp-006',
    name: 'Utkal Hospital',
    type: 'PRIVATE',
    status: 'PENDING',
    address: 'Defence Colony, Niladri Vihar, Chandrasekharpur, Bhubaneswar 751021',
    city: 'Bhubaneswar',
    pincode: '751021',
    latitude: 20.3340,
    longitude: 85.8110,
    emergencyPhone: '0674-7181000',
    totalBeds: 110,
    availableBeds: 15,
  },
];

export const mockWards: MockWardInventory[] = [
  // hosp-001 (AIIMS)
  { id: 'w-101', hospitalId: 'hosp-001', wardType: 'ICU', total: 40, occupied: 35, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 25, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-102', hospitalId: 'hosp-001', wardType: 'NICU', total: 20, occupied: 16, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 10, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-103', hospitalId: 'hosp-001', wardType: 'PICU', total: 15, occupied: 12, reserved: 0, cleaning: 1, maintenance: 0, hasVentilatorBeds: 8, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-104', hospitalId: 'hosp-001', wardType: 'HDU', total: 25, occupied: 20, reserved: 2, cleaning: 0, maintenance: 1, hasVentilatorBeds: 6, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-105', hospitalId: 'hosp-001', wardType: 'CCU', total: 20, occupied: 18, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 8, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-106', hospitalId: 'hosp-001', wardType: 'GENERAL', total: 50, occupied: 42, reserved: 3, cleaning: 2, maintenance: 0, hasVentilatorBeds: 0, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-107', hospitalId: 'hosp-001', wardType: 'PRIVATE', total: 20, occupied: 17, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 0, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-108', hospitalId: 'hosp-001', wardType: 'EMERGENCY', total: 10, occupied: 8, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-109', hospitalId: 'hosp-001', wardType: 'ISOLATION', total: 10, occupied: 6, reserved: 0, cleaning: 1, maintenance: 0, hasVentilatorBeds: 4, free: 3, version: 1, updatedAt: new Date().toISOString() },

  // hosp-002 (SUM)
  { id: 'w-201', hospitalId: 'hosp-002', wardType: 'ICU', total: 35, occupied: 28, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 20, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-202', hospitalId: 'hosp-002', wardType: 'NICU', total: 15, occupied: 11, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 8, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-203', hospitalId: 'hosp-002', wardType: 'PICU', total: 10, occupied: 7, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 5, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-204', hospitalId: 'hosp-002', wardType: 'HDU', total: 25, occupied: 19, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 5, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-205', hospitalId: 'hosp-002', wardType: 'CCU', total: 20, occupied: 16, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 6, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-206', hospitalId: 'hosp-002', wardType: 'GENERAL', total: 45, occupied: 35, reserved: 2, cleaning: 2, maintenance: 0, hasVentilatorBeds: 0, free: 6, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-207', hospitalId: 'hosp-002', wardType: 'PRIVATE', total: 20, occupied: 14, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 0, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-208', hospitalId: 'hosp-002', wardType: 'EMERGENCY', total: 10, occupied: 6, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 3, version: 1, updatedAt: new Date().toISOString() },

  // hosp-003 (KIMS)
  { id: 'w-301', hospitalId: 'hosp-003', wardType: 'ICU', total: 50, occupied: 38, reserved: 4, cleaning: 2, maintenance: 1, hasVentilatorBeds: 30, free: 5, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-302', hospitalId: 'hosp-003', wardType: 'NICU', total: 25, occupied: 19, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 12, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-303', hospitalId: 'hosp-003', wardType: 'HDU', total: 30, occupied: 22, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 8, free: 5, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-304', hospitalId: 'hosp-003', wardType: 'CCU', total: 25, occupied: 20, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 10, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-305', hospitalId: 'hosp-003', wardType: 'GENERAL', total: 70, occupied: 56, reserved: 4, cleaning: 2, maintenance: 0, hasVentilatorBeds: 0, free: 8, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-306', hospitalId: 'hosp-003', wardType: 'EMERGENCY', total: 15, occupied: 10, reserved: 2, cleaning: 0, maintenance: 0, hasVentilatorBeds: 6, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-307', hospitalId: 'hosp-003', wardType: 'ISOLATION', total: 15, occupied: 8, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 5, free: 5, version: 1, updatedAt: new Date().toISOString() },

  // hosp-004 (Apollo)
  { id: 'w-401', hospitalId: 'hosp-004', wardType: 'ICU', total: 30, occupied: 27, reserved: 2, cleaning: 0, maintenance: 0, hasVentilatorBeds: 20, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-402', hospitalId: 'hosp-004', wardType: 'CCU', total: 20, occupied: 18, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 8, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-403', hospitalId: 'hosp-004', wardType: 'HDU', total: 20, occupied: 17, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 2, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-404', hospitalId: 'hosp-004', wardType: 'GENERAL', total: 50, occupied: 43, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 0, free: 4, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-405', hospitalId: 'hosp-004', wardType: 'EMERGENCY', total: 10, occupied: 8, reserved: 1, cleaning: 0, maintenance: 0, hasVentilatorBeds: 4, free: 1, version: 1, updatedAt: new Date().toISOString() },

  // hosp-005 (Capital Hospital)
  { id: 'w-501', hospitalId: 'hosp-005', wardType: 'ICU', total: 30, occupied: 28, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 15, free: 0, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-502', hospitalId: 'hosp-005', wardType: 'NICU', total: 20, occupied: 17, reserved: 1, cleaning: 1, maintenance: 0, hasVentilatorBeds: 8, free: 1, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-503', hospitalId: 'hosp-005', wardType: 'GENERAL', total: 80, occupied: 72, reserved: 3, cleaning: 2, maintenance: 0, hasVentilatorBeds: 0, free: 3, version: 1, updatedAt: new Date().toISOString() },
  { id: 'w-504', hospitalId: 'hosp-005', wardType: 'EMERGENCY', total: 20, occupied: 16, reserved: 2, cleaning: 1, maintenance: 0, hasVentilatorBeds: 6, free: 1, version: 1, updatedAt: new Date().toISOString() },
];

export const mockEquipmentList: MockEquipment[] = [
  // hosp-001 (AIIMS)
  { id: 'eq-101', hospitalId: 'hosp-001', name: '3T MRI Scanner A', type: 'MRI', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 45 * 60000).toISOString() },
  { id: 'eq-102', hospitalId: 'hosp-001', name: '128-Slice CT Scanner 1', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-103', hospitalId: 'hosp-001', name: 'ICU Ventilator Bank #1', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 120 * 60000).toISOString() },
  { id: 'eq-104', hospitalId: 'hosp-001', name: 'ICU Ventilator Bank #2', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-105', hospitalId: 'hosp-001', name: 'Dialysis Station #1', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 90 * 60000).toISOString() },
  { id: 'eq-106', hospitalId: 'hosp-001', name: 'Dialysis Station #2', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-107', hospitalId: 'hosp-001', name: 'Neonatal Incubator Alpha', type: 'INCUBATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-108', hospitalId: 'hosp-001', name: 'Emergency Trauma OT-1', type: 'OT', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 30 * 60000).toISOString() },
  { id: 'eq-109', hospitalId: 'hosp-001', name: 'Digital X-Ray Unit 1', type: 'XRAY', status: 'OPERATIONAL', inUse: false, availableAt: null },

  // hosp-002 (SUM)
  { id: 'eq-201', hospitalId: 'hosp-002', name: 'Signa 1.5T MRI', type: 'MRI', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-202', hospitalId: 'hosp-002', name: '64-Slice Cardiac CT', type: 'CT', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 20 * 60000).toISOString() },
  { id: 'eq-203', hospitalId: 'hosp-002', name: 'Servo Ventilator Unit 4', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-204', hospitalId: 'hosp-002', name: 'Fresenius Dialysis Unit A', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-205', hospitalId: 'hosp-002', name: 'Drager Neonatal Warmer', type: 'INCUBATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-206', hospitalId: 'hosp-002', name: 'General Surgical OT-2', type: 'OT', status: 'OPERATIONAL', inUse: false, availableAt: null },

  // hosp-003 (KIMS)
  { id: 'eq-301', hospitalId: 'hosp-003', name: 'Siemens 3T Vida MRI', type: 'MRI', status: 'MAINTENANCE', inUse: false, availableAt: null },
  { id: 'eq-302', hospitalId: 'hosp-003', name: 'Somatom Dual Source CT', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-303', hospitalId: 'hosp-003', name: 'Puritan Bennett 980', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-304', hospitalId: 'hosp-003', name: 'Nikkiso Dialysis Bay 1', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 60 * 60000).toISOString() },
  { id: 'eq-305', hospitalId: 'hosp-003', name: 'Giraffe Omnibed Incubator', type: 'INCUBATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-306', hospitalId: 'hosp-003', name: 'Advanced Neuro OT', type: 'OT', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 180 * 60000).toISOString() },

  // hosp-004 (Apollo)
  { id: 'eq-401', hospitalId: 'hosp-004', name: 'Apollo 1.5T MRI Suite', type: 'MRI', status: 'OPERATIONAL', inUse: true, availableAt: new Date(Date.now() + 50 * 60000).toISOString() },
  { id: 'eq-402', hospitalId: 'hosp-004', name: 'Apollo 256 Slice CT', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-403', hospitalId: 'hosp-004', name: 'Critical Care Ventilator Unit', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-404', hospitalId: 'hosp-004', name: 'Renal Care Hemodialysis', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },

  // hosp-005 (Capital Hospital)
  { id: 'eq-501', hospitalId: 'hosp-005', name: 'Public CT Unit 1', type: 'CT', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-502', hospitalId: 'hosp-005', name: 'Emergency Ventilator Array', type: 'VENTILATOR', status: 'OPERATIONAL', inUse: false, availableAt: null },
  { id: 'eq-503', hospitalId: 'hosp-005', name: 'Government Dialysis Center', type: 'DIALYSIS', status: 'OPERATIONAL', inUse: false, availableAt: null },
];

export const mockBedRequests: MockBedRequest[] = [
  {
    id: 'req-001',
    hospitalId: 'hosp-001',
    patientId: 'usr-patient-1',
    patientName: 'Subhashree Nayak',
    bedType: 'ICU',
    severity: 5,
    status: 'HOLD',
    holdExpiresAt: new Date(Date.now() + 11 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    id: 'req-002',
    hospitalId: 'hosp-001',
    patientId: 'usr-patient-2',
    patientName: 'Rohan Tripathy',
    bedType: 'HDU',
    severity: 4,
    status: 'HOLD',
    holdExpiresAt: new Date(Date.now() + 7 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'req-003',
    hospitalId: 'hosp-002',
    patientId: 'usr-patient-3',
    patientName: 'Amitav Das',
    bedType: 'NICU',
    severity: 5,
    status: 'HOLD',
    holdExpiresAt: new Date(Date.now() + 14 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
  },
];

export const mockAuditLogs = [
  {
    id: 'aud-001',
    actorId: 'usr-cityadmin',
    action: 'HOSPITAL_VERIFIED',
    resourceType: 'hospital',
    resourceId: 'hosp-002',
    ip: '127.0.0.1',
    meta: { status: 'VERIFIED', approvedBy: 'Director of Health Services' },
    at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'aud-002',
    actorId: 'usr-admin-aiims',
    action: 'WARD_INVENTORY_ADJUSTED',
    resourceType: 'ward_inventory',
    resourceId: 'hosp-001',
    ip: '127.0.0.1',
    meta: { bedType: 'ICU', delta: { occupied: 1 } },
    at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'aud-003',
    actorId: 'usr-cityadmin',
    action: 'STAFF_PRE_REGISTERED',
    resourceType: 'user_prereg',
    resourceId: 'nurse.jen@aiims.edu',
    ip: '127.0.0.1',
    meta: { hospitalId: 'hosp-001', role: 'HOSPITAL_STAFF' },
    at: new Date(Date.now() - 1800000).toISOString(),
  },
];
