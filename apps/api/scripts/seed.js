import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://cityhealth_user:cityhealth_secret_password@localhost:5432/cityhealth';
const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

const WARD_TYPES = [
  'ICU', 'NICU', 'PICU', 'HDU', 'CCU',
  'GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'EMERGENCY', 'ISOLATION'
];

/**
 * Bhubaneswar hospital registry — public addresses / emergency phones from
 * hospital sites, AIIMS NIC, Apollo, SUM Ultimate, US Consulate Odisha list (2024), Practo.
 * Bed counts are operational estimates for live inventory testing (not a claim of live occupancy).
 */
const HOSPITAL_TEMPLATES = [
  { name: 'AIIMS Bhubaneswar', type: 'GOVERNMENT', pin: '751019', lat: 20.2219, lng: 85.7691, trauma: 3, phone: '+91-674-2476461', email: 'emergency@aiimsbhubaneswar.edu.in', address: 'Sijua, Patrapada, Bhubaneswar, Odisha 751019', bedsHint: 960 },
  { name: 'Apollo Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751005', lat: 20.3148, lng: 85.8192, trauma: 3, phone: '+91-674-6660666', email: 'emergency.bbsr@apollohospitals.com', address: 'Plot No. 251, Sainik School Road, Unit 15, Gajapati Nagar, Bhubaneswar 751005', bedsHint: 350 },
  { name: 'SUM Ultimate Medicare', type: 'PRIVATE', pin: '751003', lat: 20.2536, lng: 85.7805, trauma: 3, phone: '+91-674-3500500', email: 'sumum_bbsr@soahospitals.com', address: 'K-8, Kalinga Nagar, Ghatikia, Bhubaneswar, Odisha 751003', bedsHint: 450 },
  { name: 'Institute of Medical Sciences & SUM Hospital', type: 'PRIVATE', pin: '751003', lat: 20.2498, lng: 85.7782, trauma: 3, phone: '+91-674-2386292', email: 'ims@soa.ac.in', address: 'Kalinga Nagar, Ghatikia / Campus-1, Bhubaneswar 751003', bedsHint: 750 },
  { name: 'KIMS Hospital & Medical College', type: 'PRIVATE', pin: '751024', lat: 20.3532, lng: 85.8105, trauma: 3, phone: '+91-674-7105300', email: 'helpdesk@kims.ac.in', address: 'KIIT Campus, Patia, Bhubaneswar, Odisha 751024', bedsHint: 2600 },
  { name: 'AMRI Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751030', lat: 20.2492, lng: 85.7868, trauma: 2, phone: '+91-674-6666600', email: 'info.bbsr@amrihospitals.in', address: 'Plot No. 1, Near Jayadev Vatika / Satyasai Enclave, Khandagiri, Bhubaneswar 751030', bedsHint: 400 },
  { name: 'CARE Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751016', lat: 20.3326, lng: 85.8218, trauma: 2, phone: '+91-40-68106589', email: 'info.bbsr@carehospitals.com', address: 'Unit-42, Plot 324, Prachi Enclave Road, Rail Vihar, Chandrasekharpur, Bhubaneswar 751016', bedsHint: 220 },
  { name: 'Kalinga Hospital', type: 'TRUST', pin: '751023', lat: 20.3345, lng: 85.8248, trauma: 2, phone: '+91-674-6665200', email: 'info@kalingahospital.com', address: 'Maitri Vihar, NALCO Nagar, Chandrasekharpur, Bhubaneswar 751023', bedsHint: 250 },
  { name: 'Capital Hospital (Govt)', type: 'GOVERNMENT', pin: '751001', lat: 20.2705, lng: 85.8338, trauma: 2, phone: '+91-674-2391983', email: 'capitalhosp.bbsr@gov.in', address: 'Unit-6, BJB Nagar / Ganga Nagar corridor, Bhubaneswar 751001', bedsHint: 650 },
  { name: 'Hi-Tech Medical College & Hospital', type: 'PRIVATE', pin: '751025', lat: 20.2965, lng: 85.8702, trauma: 2, phone: '+91-674-2371217', email: 'info@hi-techmedical.org', address: 'Health Park, Pandara, Rasulgarh, Bhubaneswar 751025', bedsHint: 750 },
  { name: 'Utkal Hospital Bhubaneswar', type: 'PRIVATE', pin: '751023', lat: 20.3412, lng: 85.8185, trauma: 2, phone: '+91-674-6681000', email: 'contact@utkalhospital.com', address: 'C.S. Pur / Info City corridor, Bhubaneswar 751023', bedsHint: 200 },
  { name: 'Sparsh Hospitals & Critical Care', type: 'PRIVATE', pin: '751007', lat: 20.2688, lng: 85.8412, trauma: 2, phone: '+91-674-6626666', email: 'sparsh.care@sparshhospital.com', address: 'Saurav Vihar / Saheed Nagar area, Bhubaneswar 751007', bedsHint: 150 },
  { name: 'Ayush Hospitals & Trauma Centre', type: 'PRIVATE', pin: '751014', lat: 20.2895, lng: 85.8455, trauma: 2, phone: '+91-674-7111100', email: 'emergency@ayushhospitals.com', address: 'Near Bomikhal / Cuttack Road corridor, Bhubaneswar 751014', bedsHint: 180 },
  { name: 'Aditya CARE Hospital', type: 'PRIVATE', pin: '751016', lat: 20.3298, lng: 85.8195, trauma: 2, phone: '+91-674-3053200', email: 'contact@adityacare.com', address: 'Chandrasekharpur, Bhubaneswar 751016', bedsHint: 160 },
  { name: 'Kar Clinic & Hospital', type: 'PRIVATE', pin: '751001', lat: 20.2682, lng: 85.8401, trauma: 1, phone: '+91-674-2534888', email: 'info@karclinic.com', address: 'Unit-3 / Master Canteen area, Bhubaneswar 751001', bedsHint: 100 },
  { name: 'Neelachal Hospital', type: 'PRIVATE', pin: '751001', lat: 20.2755, lng: 85.8288, trauma: 1, phone: '+91-674-2536590', email: 'care@neelachalhospital.in', address: 'Unit-4 / Station Square corridor, Bhubaneswar 751001', bedsHint: 80 },
  { name: 'Vivekananda Hospital', type: 'PRIVATE', pin: '751003', lat: 20.2558, lng: 85.7925, trauma: 1, phone: '+91-674-2595200', email: 'admin@vivekanandahospital.com', address: 'Fire Station Square / CRP Square area, Bhubaneswar 751003', bedsHint: 120 },
  { name: 'Hemalata Hospitals', type: 'PRIVATE', pin: '751023', lat: 20.3388, lng: 85.8302, trauma: 1, phone: '+91-674-2302444', email: 'hemalatacancer@gmail.com', address: 'Chandrasekharpur, Bhubaneswar 751023', bedsHint: 100 },
  { name: 'Panda Curative Hospital', type: 'PRIVATE', pin: '751012', lat: 20.2912, lng: 85.8522, trauma: 2, phone: '+91-674-2390111', email: 'info@pandacurative.com', address: 'Near Cuttack Road / Rasulgarh, Bhubaneswar 751012', bedsHint: 140 },
  { name: 'ESIC Model Hospital Bhubaneswar', type: 'GOVERNMENT', pin: '751022', lat: 20.3105, lng: 85.8055, trauma: 2, phone: '+91-674-2540024', email: 'ms-odisha@esic.nic.in', address: 'Bhubaneswar, Odisha 751022', bedsHint: 200 },
  { name: 'Blue Wheel Hospital', type: 'PRIVATE', pin: '751017', lat: 20.3055, lng: 85.7988, trauma: 1, phone: '+91-674-2747444', email: 'info@bluewheelhospital.com', address: 'Near Jayadev Vihar / Nandankanan Road corridor, Bhubaneswar 751017', bedsHint: 90 },
  { name: 'Sunshine Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751010', lat: 20.2855, lng: 85.8625, trauma: 1, phone: '+91-674-2567890', email: 'contact@sunshinebbsr.com', address: 'Near Bomikhal / Mancheswar industrial area, Bhubaneswar 751010', bedsHint: 110 },
  { name: 'BMC Capital Maternity Unit', type: 'GOVERNMENT', pin: '751009', lat: 20.2655, lng: 85.8125, trauma: 1, phone: '+91-674-2431200', email: 'bmc.health@gov.in', address: 'BMC Health facilities corridor, Bhubaneswar 751009', bedsHint: 60 },
  { name: 'Bhubaneswar Trauma & Orthopedic Centre', type: 'PRIVATE', pin: '751007', lat: 20.2722, lng: 85.8488, trauma: 2, phone: '+91-674-2571234', email: 'traumacare@btoc.org', address: 'Saheed Nagar / CRP Square corridor, Bhubaneswar 751007', bedsHint: 80 },
  { name: 'Ashwini Hospital Bhubaneswar', type: 'PRIVATE', pin: '751019', lat: 20.2355, lng: 85.7855, trauma: 1, phone: '+91-674-2471199', email: 'help@ashwinihospital.com', address: 'Near Khandagiri / Jagamara corridor, Bhubaneswar 751019', bedsHint: 100 },
];

export const CONDITIONS = [
  {
    code: 'STROKE',
    name: 'Acute Ischemic / Hemorrhagic Stroke',
    aliases: ['Brain Stroke', 'Paralysis attack', 'CVA', 'Cerebrovascular Accident'],
    icd10: 'I63',
    category: 'Neurological',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'MRI', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Neurology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'PREMATURE_BABY',
    name: 'Premature Birth & Neonatal Respiratory Distress',
    aliases: ['Preemie', 'Preterm Infant', 'Neonatal Jaundice', 'RDS'],
    icd10: 'P07',
    category: 'Neonatal',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'NICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'INCUBATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Neonatology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'DENGUE_SEVERE',
    name: 'Severe Dengue with Hemorrhagic Shock',
    aliases: ['Dengue Hemorrhagic Fever', 'DHF', 'Low Platelet Emergency'],
    icd10: 'A91',
    category: 'Infectious',
    severity_default: 'URGENT',
    requirements: [
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'FACILITY', value: 'Blood Bank', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'CARDIAC_ARREST',
    name: 'Acute Myocardial Infarction / Cardiac Arrest',
    aliases: ['Heart Attack', 'STEMI', 'Ventricular Fibrillation'],
    icd10: 'I21',
    category: 'Cardiovascular',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'CCU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Cardiology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'POLY_TRAUMA',
    name: 'Severe Polytrauma & Road Traffic Accident',
    aliases: ['RTA', 'Accident Crash', 'Multiple Fractures', 'Head Injury'],
    icd10: 'T07',
    category: 'Trauma',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'SEVERE_PNEUMONIA',
    name: 'Severe Acute Pneumonia & ARDS',
    aliases: ['ARDS', 'Respiratory Failure', 'Lung Infection Critical'],
    icd10: 'J18',
    category: 'Respiratory',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'ACUTE_RENAL_FAILURE',
    name: 'Acute Kidney Injury (AKI) & Uremic Encephalopathy',
    aliases: ['Kidney Failure', 'Acute Renal Failure', 'Hyperkalemia'],
    icd10: 'N17',
    category: 'Nephrology',
    severity_default: 'URGENT',
    requirements: [
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'DIALYSIS', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'BURNS_MAJOR',
    name: 'Major Thermal / Chemical Burns (>30% TBSA)',
    aliases: ['Severe Burn Injury', 'Acid Burn', 'Fire Burns'],
    icd10: 'T30',
    category: 'Trauma',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ISOLATION', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'SEPTIC_SHOCK',
    name: 'Septic Shock & Multiple Organ Dysfunction (MODS)',
    aliases: ['Sepsis', 'Bacteremia', 'Septicemia'],
    icd10: 'R65.21',
    category: 'Critical Care',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'HIGH_RISK_PREGNANCY',
    name: 'Eclampsia & Obstructed Labor Emergency',
    aliases: ['Eclampsia', 'Placental Abruption', 'Maternal Shock'],
    icd10: 'O14',
    category: 'Obstetrics',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'NICU', qty: 1, mandatory: true, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Obstetrics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'STATUS_EPILEPTICUS',
    name: 'Refractory Status Epilepticus',
    aliases: ['Continuous Seizures', 'Epileptic Fits', 'Prolonged Convulsion'],
    icd10: 'G41',
    category: 'Neurological',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Neurology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'INTRACRANIAL_HEMORRHAGE',
    name: 'Acute Intracranial / Subarachnoid Hemorrhage',
    aliases: ['Brain Bleed', 'Subarachnoid Hemorrhage', 'SAH', 'Aneurysm Rupture'],
    icd10: 'I60',
    category: 'Neurological',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Neurosurgery', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'MENINGITIS_ACUTE',
    name: 'Acute Bacterial / Tubercular Meningitis',
    aliases: ['Brain Infection', 'Meningococcal Infection', 'Stiff Neck Fever'],
    icd10: 'G00',
    category: 'Infectious',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ISOLATION', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: false, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Neurology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'ASTHMA_CRITICAL',
    name: 'Life-Threatening Acute Status Asthmaticus',
    aliases: ['Severe Asthma Attack', 'Bronchospasm Crisis', 'Severe Wheezing'],
    icd10: 'J46',
    category: 'Respiratory',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 1 }
    ]
  },
  {
    code: 'COPD_EXACERBATION',
    name: 'Acute Exacerbation of COPD with Respiratory Acidosis',
    aliases: ['COPD Crisis', 'Chronic Bronchitis Flare', 'Smoker Cough Severe'],
    icd10: 'J44.1',
    category: 'Respiratory',
    severity_default: 'URGENT',
    requirements: [
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 1 }
    ]
  },
  {
    code: 'PULMONARY_EMBOLISM',
    name: 'Massive Acute Pulmonary Embolism',
    aliases: ['PE', 'Lung Blood Clot', 'Right Heart Strain'],
    icd10: 'I26',
    category: 'Cardiovascular',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'CCU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Cardiology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'AORTIC_DISSECTION',
    name: 'Stanford Type A / B Aortic Dissection',
    aliases: ['Torn Aorta', 'Aortic Aneurysm Rupture', 'Severe Chest Tearing'],
    icd10: 'I71.0',
    category: 'Cardiovascular',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'CCU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Cardiac Surgery', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'CARDIOGENIC_SHOCK',
    name: 'Cardiogenic Shock & End-Stage Heart Failure',
    aliases: ['Heart Failure Shock', 'Pump Failure', 'Hypotensive Heart Emergency'],
    icd10: 'R57.0',
    category: 'Cardiovascular',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'CCU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Cardiology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'DIABETIC_KETOACIDOSIS',
    name: 'Diabetic Ketoacidosis (DKA) & Hyperosmolar State',
    aliases: ['DKA', 'Diabetic Coma', 'High Blood Sugar Shock'],
    icd10: 'E10.1',
    category: 'Endocrine',
    severity_default: 'URGENT',
    requirements: [
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'General Medicine', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'SNAKEBITE_ENVENOMATION',
    name: 'Severe Neurotoxic / Hemotoxic Snake Envenomation',
    aliases: ['Snake Bite', 'Cobra Bite', 'Viper Bite', 'Coagulopathy'],
    icd10: 'T63.0',
    category: 'Toxicology',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 1 },
      { kind: 'FACILITY', value: 'Blood Bank', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'POISONING_ORGANOPHOSPHATE',
    name: 'Severe Organophosphate / Pesticide Poisoning',
    aliases: ['OP Poisoning', 'Pesticide ingestion', 'Cholinergic Crisis'],
    icd10: 'T60.0',
    category: 'Toxicology',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Critical Care', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'ACUTE_PANCREATITIS_SEVERE',
    name: 'Necrotizing Acute Pancreatitis with Shock',
    aliases: ['Pancreas Inflammation', 'Necrotic Pancreatitis', 'Acute Abdomen'],
    icd10: 'K85',
    category: 'Gastroenterology',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Gastroenterology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'UPPER_GI_BLEED_MASSIVE',
    name: 'Massive Upper GI Bleeding & Esophageal Variceal Hemorrhage',
    aliases: ['Blood Vomiting', 'Hematemesis', 'Variceal Bleed', 'Stomach Ulcer Bleed'],
    icd10: 'K92.0',
    category: 'Gastroenterology',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'FACILITY', value: 'Blood Bank', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Gastroenterology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'INTESTINAL_PERFORATION_PERITONITIS',
    name: 'Perforated Viscus & Acute Generalized Peritonitis',
    aliases: ['Bowel Perforation', 'Burst Appendix', 'Peritonitis', 'Septic Abdomen'],
    icd10: 'K65.0',
    category: 'Surgery',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'X_RAY', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'ACUTE_LIVER_FAILURE',
    name: 'Fulminant Hepatic Failure & Hepatic Encephalopathy',
    aliases: ['Liver Failure', 'Hepatic Coma', 'Jaundice Emergency'],
    icd10: 'K72.0',
    category: 'Hepatology',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'DIALYSIS', qty: 1, mandatory: false, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Gastroenterology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'HEAT_STROKE_HYPERPYREXIA',
    name: 'Exertional / Classic Heat Stroke with Multi-Organ Failure',
    aliases: ['Heat Exhaustion', 'Hyperthermia', 'Sun Stroke High Fever'],
    icd10: 'T67.0',
    category: 'Environmental',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Emergency Care', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'PEDIATRIC_SEPSIS',
    name: 'Severe Pediatric Sepsis with Hemodynamic Instability',
    aliases: ['Child Sepsis', 'Infant Blood Infection', 'Pediatric Shock'],
    icd10: 'A41.9',
    category: 'Pediatric',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'PICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Pediatrics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'PEDIATRIC_CONVULSION_FEBRILE',
    name: 'Complex Febrile Status in Children',
    aliases: ['Child Convulsion', 'Febrile Seizures', 'Pediatric Fits'],
    icd10: 'R56.0',
    category: 'Pediatric',
    severity_default: 'URGENT',
    requirements: [
      { kind: 'BED', value: 'PICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Pediatrics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'PEDIATRIC_PNEUMONIA_ARDS',
    name: 'Severe Pediatric Viral / Bacterial Pneumonia with Hypoxia',
    aliases: ['Child Pneumonia', 'Pediatric Breathing Difficulty', 'Child Lung Infection'],
    icd10: 'J18.9',
    category: 'Pediatric',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'PICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Pediatrics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'NEONATAL_SEPSIS',
    name: 'Early / Late Onset Neonatal Sepsis',
    aliases: ['Newborn Infection', 'Infant Sepsis', 'Neonatal Fever Crisis'],
    icd10: 'P36',
    category: 'Neonatal',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'NICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'INCUBATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Neonatology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'NEONATAL_MECONIUM_ASPIRATION',
    name: 'Meconium Aspiration Syndrome (MAS) in Newborn',
    aliases: ['MAS', 'Newborn Breathing Distress', 'Meconium Ingestion'],
    icd10: 'P24.0',
    category: 'Neonatal',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'NICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'INCUBATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Neonatology', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'SPINAL_CORD_INJURY_ACUTE',
    name: 'Acute Traumatic Cervical / Thoracic Spinal Cord Injury',
    aliases: ['Spine Fracture', 'Paraplegia Trauma', 'Spinal Shock', 'Broken Neck'],
    icd10: 'S14.1',
    category: 'Trauma',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'MRI', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Orthopedics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'FRACTURE_PELVIS_UNSTABLE',
    name: 'Unstable Pelvic Ring Disruption with Retroperitoneal Bleed',
    aliases: ['Pelvic Fracture', 'Crushed Pelvis', 'Internal Hemorrhage Hip'],
    icd10: 'S32.8',
    category: 'Trauma',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'X_RAY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Orthopedics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'CRUSH_INJURY_COMPARTMENT_SYNDROME',
    name: 'Acute Extremity Compartment Syndrome & Rhabdomyolysis',
    aliases: ['Compartment Syndrome', 'Crushed Limb', 'Limb Ischemia Emergency'],
    icd10: 'T79.A',
    category: 'Trauma',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'EMERGENCY', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'DIALYSIS', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'SPECIALTY', value: 'Orthopedics', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'TETANUS_SEVERE',
    name: 'Severe Generalized Tetanus with Autonomic Storm',
    aliases: ['Lockjaw', 'Tetanus Spasm', 'Clostridium Infection'],
    icd10: 'A35',
    category: 'Infectious',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ISOLATION', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Critical Care', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'COVID19_SEVERE_HYPOXIA',
    name: 'Severe COVID-19 Acute Hypoxemic Respiratory Failure',
    aliases: ['Severe Coronavirus', 'COVID ARDS', 'Low SpO2 Infection'],
    icd10: 'U07.1',
    category: 'Infectious',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ISOLATION', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: true, preference_order: 1 }
    ]
  },
  {
    code: 'TUBERCULOSIS_MDR_MASSIVE_HEMOPTYSIS',
    name: 'MDR-TB with Life-Threatening Massive Hemoptysis',
    aliases: ['TB Bleed', 'Coughing Blood Severe', 'Drug Resistant TB'],
    icd10: 'A15.0',
    category: 'Infectious',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ISOLATION', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'OPERATION_THEATRE', qty: 1, mandatory: false, preference_order: 2 }
    ]
  },
  {
    code: 'MALARIA_CEREBRAL',
    name: 'Severe Falciparum Malaria with Cerebral Coma',
    aliases: ['Cerebral Malaria', 'Falciparum Coma', 'Malignant Fever'],
    icd10: 'B50.0',
    category: 'Infectious',
    severity_default: 'CRITICAL',
    requirements: [
      { kind: 'BED', value: 'ICU', qty: 1, mandatory: true, preference_order: 1 },
      { kind: 'BED', value: 'HDU', qty: 1, mandatory: false, preference_order: 2 },
      { kind: 'EQUIPMENT', value: 'DIALYSIS', qty: 1, mandatory: false, preference_order: 1 },
      { kind: 'SPECIALTY', value: 'Critical Care', qty: 1, mandatory: true, preference_order: 1 }
    ]
  }
];

async function seed() {
    console.log('[Seed] Seeding Bhubaneswar health network (hospitals, beds, ambulances, AI knowledge)...');
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed or Upsert CITY_ADMIN from env
    const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'cityadmin.bhubaneswar@gmail.com';
    console.log(`[Seed] Provisioning City Admin: ${seedAdminEmail}`);
    
    await client.query(`
      INSERT INTO users (email, name, role, status)
      VALUES ($1, 'Bhubaneswar Health Officer (City Admin)', 'CITY_ADMIN', 'ACTIVE')
      ON CONFLICT (email) 
      DO UPDATE SET role = 'CITY_ADMIN', status = 'ACTIVE';
    `, [seedAdminEmail.toLowerCase()]);

    // 2. Seed verified Bhubaneswar hospitals (public addresses + emergency phones)
    console.log(`[Seed] Creating ${HOSPITAL_TEMPLATES.length} Bhubaneswar hospitals...`);
    const hospitalIds = [];
    const allBedRows = [];
    const allEqRows = [];

    for (let i = 0; i < HOSPITAL_TEMPLATES.length; i++) {
      const h = HOSPITAL_TEMPLATES[i];
      const lat = h.lat;
      const lng = h.lng;
      const regNo = `OD-BBSR-2026-${String(i + 1).padStart(4, '0')}`;
      const address = h.address || `${h.name}, Bhubaneswar, Odisha ${h.pin}`;
      const specialties = ['General Medicine', 'Emergency Care', 'Critical Care', 'Pediatrics', 'Obstetrics'];
      if (h.trauma >= 2) specialties.push('Neurology', 'Cardiology', 'Orthopedics');
      if (h.trauma === 3) specialties.push('Neurosurgery', 'Cardiac Surgery', 'Neonatology', 'Nephrology', 'Gastroenterology');
      const facilities = ['24/7 Pharmacy', 'Emergency Ambulance Bay', 'Pathology Lab', 'Blood Bank', 'Trauma Centre'];

      const res = await client.query(`
        INSERT INTO hospitals (
          name, type, registration_no, address, city, pin,
          location, phone, email, emergency_24x7, trauma_level,
          specialties, facilities, rating_avg, status
        )
        VALUES (
          $1, $2, $3, $4, 'Bhubaneswar', $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
          $8, $9, true, $10,
          $11, $12, $13, 'VERIFIED'
        )
        ON CONFLICT (registration_no) 
        DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          location = EXCLUDED.location,
          trauma_level = EXCLUDED.trauma_level,
          specialties = EXCLUDED.specialties,
          facilities = EXCLUDED.facilities,
          status = 'VERIFIED'
        RETURNING id;
      `, [
        h.name, h.type, regNo, address, h.pin,
        lng, lat, // Longitude first in ST_MakePoint(lng, lat)
        h.phone, h.email.toLowerCase(), h.trauma,
        specialties, facilities, (4.0 + (i % 9) * 0.1).toFixed(2)
      ]);

      const hospitalId = res.rows[0].id;
      hospitalIds.push({ id: hospitalId, name: h.name, email: h.email });

      // Bed inventory scaled from published / public bed-capacity hints
      const scale = Math.max(0.4, Math.min(2.5, (h.bedsHint || 200) / 250));
      for (const wardType of WARD_TYPES) {
        let total = Math.round(20 * scale);
        let occupied = Math.round(12 * scale);
        let reserved = 2;
        let cleaning = 1;
        let maintenance = 0;
        let ventBeds = 0;

        if (wardType === 'ICU') {
          total = Math.round((h.trauma === 3 ? 30 : 15) * scale);
          occupied = Math.floor(total * 0.65);
          reserved = 2;
          cleaning = 1;
          ventBeds = total;
        } else if (wardType === 'NICU' || wardType === 'PICU') {
          total = Math.round((h.trauma >= 2 ? 16 : 8) * scale);
          occupied = Math.floor(total * 0.6);
          reserved = 1;
          ventBeds = Math.min(4, total);
        } else if (wardType === 'GENERAL') {
          total = Math.round(100 * scale);
          occupied = Math.floor(total * 0.7);
          reserved = 5;
          cleaning = 4;
          maintenance = 1;
        } else if (wardType === 'EMERGENCY') {
          total = Math.round(25 * scale);
          occupied = Math.floor(total * 0.55);
          reserved = 3;
          cleaning = 2;
          ventBeds = Math.min(6, total);
        } else if (wardType === 'HDU' || wardType === 'CCU') {
          total = Math.round(20 * scale);
          occupied = Math.floor(total * 0.6);
          reserved = 2;
          cleaning = 1;
          ventBeds = Math.floor(total / 2);
        } else if (wardType === 'ISOLATION') {
          total = Math.round(12 * scale);
          occupied = Math.floor(total * 0.5);
          reserved = 1;
          cleaning = 1;
          ventBeds = Math.floor(total / 2);
        }

        const sumOccupancy = occupied + reserved + cleaning + maintenance;
        if (sumOccupancy > total) {
          occupied = total - reserved - cleaning - maintenance;
        }

        allBedRows.push({ hospitalId, wardType, total, occupied, reserved, cleaning, maintenance, ventBeds });
      }

      // Equipment list per hospital
      const equipmentList = [
        { type: 'VENTILATOR', name: 'Servo-U Critical Care Ventilator', model: 'Getinge-2024', status: 'AVAILABLE', crit: 'CRITICAL' },
        { type: 'VENTILATOR', name: 'Puritan Bennett 980', model: 'Medtronic-PB980', status: 'IN_USE', crit: 'CRITICAL' },
        { type: 'CT', name: 'Somatom Force 128-Slice Dual Source CT', model: 'Siemens SOMATOM', status: 'AVAILABLE', crit: 'HIGH' },
        { type: 'MRI', name: 'Magnetom Vida 3.0T High-Field MRI', model: 'Siemens Vida', status: (i % 3 === 0 ? 'AVAILABLE' : 'IN_USE'), crit: 'NORMAL' },
        { type: 'DIALYSIS', name: 'Fresenius 5008S Hemodialysis Machine', model: 'Fresenius-5008S', status: 'AVAILABLE', crit: 'HIGH' },
        { type: 'INCUBATOR', name: 'Giraffe Omnibed Neonatal Care Station', model: 'GE Giraffe', status: 'AVAILABLE', crit: 'CRITICAL' },
        { type: 'OPERATION_THEATRE', name: 'Major Trauma & Neuro Surgical OT-1', model: 'Modulaire-Alpha', status: 'AVAILABLE', crit: 'CRITICAL' },
        { type: 'X_RAY', name: 'Definium 656 HD Digital Radiography', model: 'GE Healthcare', status: 'AVAILABLE', crit: 'NORMAL' }
      ];

      for (let eqIdx = 0; eqIdx < equipmentList.length; eqIdx++) {
        const eq = equipmentList[eqIdx];
        const serialNo = `SN-${h.pin}-${i + 1}-${eqIdx + 1}`;
        allEqRows.push({ hospitalId, type: eq.type, name: eq.name, model: eq.model, serialNo, status: eq.status, crit: eq.crit });
      }
    }

    // Batch insert bed_inventory
    console.log(`[Seed] Inserting ${allBedRows.length} bed inventories in batch...`);
    const bedValues = [];
    const bedParams = [];
    allBedRows.forEach((r, idx) => {
      const offset = idx * 8;
      bedValues.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, 1)`);
      bedParams.push(r.hospitalId, r.wardType, r.total, r.occupied, r.reserved, r.cleaning, r.maintenance, r.ventBeds);
    });

    await client.query(`
      INSERT INTO bed_inventory (
        hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance, has_ventilator_beds, version
      )
      VALUES ${bedValues.join(',\n')}
      ON CONFLICT (hospital_id, ward_type)
      DO UPDATE SET
        total = EXCLUDED.total,
        occupied = EXCLUDED.occupied,
        reserved = EXCLUDED.reserved,
        cleaning = EXCLUDED.cleaning,
        maintenance = EXCLUDED.maintenance,
        has_ventilator_beds = EXCLUDED.has_ventilator_beds,
        version = bed_inventory.version + 1;
    `, bedParams);

    // Batch insert equipment
    console.log(`[Seed] Inserting ${allEqRows.length} equipment assets in batch...`);
    const eqValues = [];
    const eqParams = [];
    allEqRows.forEach((eq, idx) => {
      const offset = idx * 7;
      eqValues.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      eqParams.push(eq.hospitalId, eq.type, eq.name, eq.model, eq.serialNo, eq.status, eq.crit);
    });

    const eqRes = await client.query(`
      INSERT INTO equipment (hospital_id, type, name, model, serial_no, status, criticality)
      VALUES ${eqValues.join(',\n')}
      ON CONFLICT DO NOTHING
      RETURNING id, status;
    `, eqParams);

    if (eqRes.rows.length > 0) {
      const logValues = [];
      const logParams = [];
      eqRes.rows.forEach((r, idx) => {
        const offset = idx * 2;
        logValues.push(`($${offset + 1}, 'OFFLINE', $${offset + 2}, NOW() - interval '2 days')`);
        logParams.push(r.id, r.status);
      });
      await client.query(`
        INSERT INTO equipment_status_log (equipment_id, old_status, new_status, at)
        VALUES ${logValues.join(',\n')};
      `, logParams);
    }

    // 5. Bootstrap pre-registered staff (disable with SEED_BOOTSTRAP_STAFF=false for production)
    if (hospitalIds.length >= 2) {
      const seedBootstrapStaff = String(process.env.SEED_BOOTSTRAP_STAFF || 'true').toLowerCase() !== 'false';
      const kims = hospitalIds.find((x) => /KIMS/i.test(x.name)) || hospitalIds[4];
      const apollo = hospitalIds.find((x) => /Apollo/i.test(x.name)) || hospitalIds[1];
      const sampleStaff = seedBootstrapStaff
        ? [
            { email: process.env.SEED_STAFF_EMAIL || 'staff.aiims@gmail.com', role: 'HOSPITAL_STAFF', hospitalId: hospitalIds[0].id },
            { email: process.env.SEED_ADMIN_HOSPITAL_EMAIL || 'admin.aiims@gmail.com', role: 'HOSPITAL_ADMIN', hospitalId: hospitalIds[0].id },
            { email: 'staff.apollo@gmail.com', role: 'HOSPITAL_STAFF', hospitalId: apollo.id },
            { email: 'admin.apollo@gmail.com', role: 'HOSPITAL_ADMIN', hospitalId: apollo.id },
            { email: 'staff.kims@gmail.com', role: 'HOSPITAL_STAFF', hospitalId: kims.id },
            { email: 'admin.kims@gmail.com', role: 'HOSPITAL_ADMIN', hospitalId: kims.id },
            { email: process.env.SEED_DOCTOR_EMAIL || 'doctor.aiims@gmail.com', role: 'DOCTOR', hospitalId: hospitalIds[0].id, specialty: 'Emergency Medicine', licenseNo: 'OD-EM-1001' },
            { email: 'doctor.kims@gmail.com', role: 'DOCTOR', hospitalId: kims.id, specialty: 'Cardiology', licenseNo: 'OD-CARD-2044' },
            { email: 'doctor.refer@gmail.com', role: 'DOCTOR', hospitalId: null, specialty: 'General Medicine', licenseNo: 'OD-GM-3300' },
            { email: 'ambulance1.bbsr@gmail.com', role: 'AMBULANCE', hospitalId: hospitalIds[0].id, specialty: 'BBSR-ALS-01', licenseNo: 'OD02AB1001', vehicleNo: 'OD02AB1001', ambulanceType: 'ALS' },
            { email: 'ambulance2.bbsr@gmail.com', role: 'AMBULANCE', hospitalId: apollo.id, specialty: 'BBSR-ALS-02', licenseNo: 'OD02AB1002', vehicleNo: 'OD02AB1002', ambulanceType: 'ALS' },
            { email: 'ambulance3.bbsr@gmail.com', role: 'AMBULANCE', hospitalId: kims.id, specialty: 'BBSR-ICU-01', licenseNo: 'OD02AB1003', vehicleNo: 'OD02AB1003', ambulanceType: 'ICU' },
            { email: 'ambulance4.bbsr@gmail.com', role: 'AMBULANCE', hospitalId: null, specialty: 'BBSR-BLS-01', licenseNo: 'OD02AB1004', vehicleNo: 'OD02AB1004', ambulanceType: 'BLS' },
            { email: 'ambulance5.bbsr@gmail.com', role: 'AMBULANCE', hospitalId: hospitalIds[2].id, specialty: 'BBSR-ALS-03', licenseNo: 'OD02AB1005', vehicleNo: 'OD02AB1005', ambulanceType: 'ALS' },
          ]
        : [];
      if (sampleStaff.length) {
        console.log('[Seed] Setting up bootstrap pre-registered staff & doctors...');
      }

      for (const s of sampleStaff) {
        await client.query(`
          INSERT INTO preregistered_staff (email, role, hospital_id, specialty, license_no, vehicle_no, ambulance_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email)
          DO UPDATE SET
            role = EXCLUDED.role,
            hospital_id = EXCLUDED.hospital_id,
            specialty = EXCLUDED.specialty,
            license_no = EXCLUDED.license_no,
            vehicle_no = EXCLUDED.vehicle_no,
            ambulance_type = EXCLUDED.ambulance_type;
        `, [
          s.email.toLowerCase(),
          s.role,
          s.hospitalId,
          s.specialty || null,
          s.licenseNo || null,
          s.vehicleNo || null,
          s.ambulanceType || null,
        ]);
      }
    }

    // 5a. Seed online ambulance fleet across Bhubaneswar (for SOS FCFS testing)
    console.log('[Seed] Seeding Bhubaneswar ambulance fleet...');
    const ambFleet = [
      { email: 'ambulance1.bbsr@gmail.com', call: 'BBSR-ALS-01', vehicle: 'OD02AB1001', type: 'ALS', lat: 20.2961, lng: 85.8245, phone: '+91-9876500001', hospitalIdx: 0 },
      { email: 'ambulance2.bbsr@gmail.com', call: 'BBSR-ALS-02', vehicle: 'OD02AB1002', type: 'ALS', lat: 20.3148, lng: 85.8192, phone: '+91-9876500002', hospitalIdx: 1 },
      { email: 'ambulance3.bbsr@gmail.com', call: 'BBSR-ICU-01', vehicle: 'OD02AB1003', type: 'ICU', lat: 20.3532, lng: 85.8105, phone: '+91-9876500003', hospitalIdx: 4 },
      { email: 'ambulance4.bbsr@gmail.com', call: 'BBSR-BLS-01', vehicle: 'OD02AB1004', type: 'BLS', lat: 20.2705, lng: 85.8338, phone: '+91-9876500004', hospitalIdx: null },
      { email: 'ambulance5.bbsr@gmail.com', call: 'BBSR-ALS-03', vehicle: 'OD02AB1005', type: 'ALS', lat: 20.2536, lng: 85.7805, phone: '+91-9876500005', hospitalIdx: 2 },
      { email: 'ambulance6.bbsr@gmail.com', call: 'BBSR-ALS-04', vehicle: 'OD02AB1006', type: 'ALS', lat: 20.3326, lng: 85.8218, phone: '+91-9876500006', hospitalIdx: 6 },
      { email: 'ambulance7.bbsr@gmail.com', call: 'BBSR-NEO-01', vehicle: 'OD02AB1007', type: 'NEONATAL', lat: 20.2492, lng: 85.7868, phone: '+91-9876500007', hospitalIdx: 5 },
      { email: 'ambulance8.bbsr@gmail.com', call: 'BBSR-ALS-05', vehicle: 'OD02AB1008', type: 'ALS', lat: 20.2219, lng: 85.7691, phone: '+91-9876500008', hospitalIdx: 0 },
    ];

    for (const a of ambFleet) {
      const userRes = await client.query(
        `INSERT INTO users (email, name, role, hospital_id, status, mobile_phone)
         VALUES ($1, $2, 'AMBULANCE', $3, 'ACTIVE', $4)
         ON CONFLICT (email) DO UPDATE SET
           role = 'AMBULANCE',
           hospital_id = EXCLUDED.hospital_id,
           status = 'ACTIVE',
           mobile_phone = COALESCE(EXCLUDED.mobile_phone, users.mobile_phone)
         RETURNING id`,
        [
          a.email.toLowerCase(),
          a.call,
          a.hospitalIdx != null ? hospitalIds[a.hospitalIdx]?.id : null,
          a.phone,
        ]
      );
      const userId = userRes.rows[0].id;
      await client.query(
        `INSERT INTO ambulances (
           user_id, hospital_id, call_sign, vehicle_no, ambulance_type, phone, status,
           location, last_location_at, city, active
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'AVAILABLE',
           ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, NOW(), 'Bhubaneswar', TRUE
         )
         ON CONFLICT (user_id) DO UPDATE SET
           hospital_id = EXCLUDED.hospital_id,
           call_sign = EXCLUDED.call_sign,
           vehicle_no = EXCLUDED.vehicle_no,
           ambulance_type = EXCLUDED.ambulance_type,
           phone = EXCLUDED.phone,
           status = 'AVAILABLE',
           location = EXCLUDED.location,
           last_location_at = NOW(),
           active = TRUE,
           updated_at = NOW()`,
        [
          userId,
          a.hospitalIdx != null ? hospitalIds[a.hospitalIdx]?.id : null,
          a.call,
          a.vehicle,
          a.type,
          a.phone,
          a.lng,
          a.lat,
        ]
      );
    }

    // 5b. Insurers + hospital empanelment + departments
    console.log('[Seed] Seeding insurers, hospital networks, and departments...');
    const INSURERS = [
      { code: 'AYUSHMAN', name: 'Ayushman Bharat (PM-JAY)', type: 'SCHEME' },
      { code: 'BSKY', name: 'Biju Swasthya Kalyan Yojana (BSKY)', type: 'SCHEME' },
      { code: 'CGHS', name: 'CGHS', type: 'GOVERNMENT' },
      { code: 'ESIC', name: 'ESIC', type: 'GOVERNMENT' },
      { code: 'ECHS', name: 'ECHS (Ex-Servicemen)', type: 'GOVERNMENT' },
      { code: 'STAR', name: 'Star Health', type: 'PRIVATE' },
      { code: 'HDFC_ERGO', name: 'HDFC Ergo', type: 'PRIVATE' },
      { code: 'ICICI_LOMBARD', name: 'ICICI Lombard', type: 'PRIVATE' },
      { code: 'NIVA_BUPA', name: 'Niva Bupa', type: 'PRIVATE' },
      { code: 'CARE_HEALTH', name: 'Care Health', type: 'PRIVATE' },
      { code: 'RELIANCE', name: 'Reliance General', type: 'PRIVATE' },
      { code: 'BAJAJ', name: 'Bajaj Allianz', type: 'PRIVATE' },
      { code: 'NEW_INDIA', name: 'New India Assurance', type: 'GOVERNMENT' },
      { code: 'ORIENTAL', name: 'Oriental Insurance', type: 'GOVERNMENT' },
      { code: 'UNITED_INDIA', name: 'United India Insurance', type: 'GOVERNMENT' },
      { code: 'MAX_BUPA', name: 'Max Bupa / Niva partner plans', type: 'PRIVATE' },
      { code: 'ADITYA_BIRLA', name: 'Aditya Birla Health', type: 'PRIVATE' },
      { code: 'MANIPAL_CIGNA', name: 'ManipalCigna', type: 'PRIVATE' },
      { code: 'SBI_GENERAL', name: 'SBI General Health', type: 'PRIVATE' },
      { code: 'TATA_AIG', name: 'Tata AIG Medicare', type: 'PRIVATE' },
    ];

    const DEFAULT_BENEFITS = {
      SCHEME: ['Cashless IP', 'Pre-auth support', 'Package rates', 'Emergency cover'],
      GOVERNMENT: ['Cashless IP', 'OPD referral', 'ICU included', 'Pharmacy on package'],
      PRIVATE: ['Cashless IP', 'Room rent as per plan', 'Pre/post hospitalisation', 'Ambulance cover'],
      CORPORATE: ['Cashless IP', 'Corporate TPA desk', 'Day-care procedures'],
    };

    const insurerIds = [];
    for (const ins of INSURERS) {
      const r = await client.query(
        `INSERT INTO insurers (code, name, type, active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, active = TRUE
         RETURNING id, code`,
        [ins.code, ins.name, ins.type]
      );
      insurerIds.push(r.rows[0]);
    }

    const DEPTS = [
      { code: 'EMERGENCY', name: 'Emergency & Trauma', specialty: 'Emergency Medicine', ward: 'EMERGENCY' },
      { code: 'CARDIOLOGY', name: 'Cardiology', specialty: 'Cardiology', ward: 'CCU' },
      { code: 'NEUROLOGY', name: 'Neurology', specialty: 'Neurology', ward: 'ICU' },
      { code: 'ORTHO', name: 'Orthopedics', specialty: 'Orthopedics', ward: 'GENERAL' },
      { code: 'PEDIATRICS', name: 'Pediatrics', specialty: 'Pediatrics', ward: 'PICU' },
      { code: 'NEONATAL', name: 'Neonatology', specialty: 'Neonatology', ward: 'NICU' },
      { code: 'GENERAL_MED', name: 'General Medicine', specialty: 'General Medicine', ward: 'GENERAL' },
      { code: 'ONCOLOGY', name: 'Oncology', specialty: 'Oncology', ward: 'SEMI_PRIVATE' },
    ];

    for (let hi = 0; hi < hospitalIds.length; hi++) {
      const hid = hospitalIds[hi].id;
      // Empanel: government hospitals get schemes; private get mix
      const accepted = insurerIds.filter((_, idx) => {
        if (hi % 3 === 0) return idx < 6; // more scheme coverage
        if (hi % 3 === 1) return idx >= 2 && idx <= 8;
        return idx % 2 === 0 || idx < 4;
      });
      for (const ins of accepted) {
        await client.query(
          `INSERT INTO hospital_insurers (hospital_id, insurer_id, cashless, notes)
           VALUES ($1, $2, TRUE, $3)
           ON CONFLICT (hospital_id, insurer_id) DO UPDATE SET
             cashless = TRUE,
             notes = EXCLUDED.notes`,
          [hid, ins.id, 'Cashless / empanelled for Bhubaneswar operations']
        );
      }
      for (const d of DEPTS) {
        await client.query(
          `INSERT INTO hospital_departments (hospital_id, code, name, specialty, ward_hint, active)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT (hospital_id, code) DO UPDATE SET
             name = EXCLUDED.name,
             specialty = EXCLUDED.specialty,
             ward_hint = EXCLUDED.ward_hint,
             active = TRUE`,
          [hid, d.code, d.name, d.specialty, d.ward]
        );
      }
    }

    // 6. Seed Conditions Taxonomy & Requirements (38 Clinical Conditions)
    console.log(`[Seed] Seeding ${CONDITIONS.length} clinical conditions and capability rules...`);
    for (const c of CONDITIONS) {
      const condRes = await client.query(`
        INSERT INTO conditions (code, name, aliases, icd10, category, severity_default)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          aliases = EXCLUDED.aliases,
          icd10 = EXCLUDED.icd10,
          category = EXCLUDED.category,
          severity_default = EXCLUDED.severity_default
        RETURNING id;
      `, [c.code, c.name, c.aliases, c.icd10, c.category, c.severity_default]);

      const conditionId = condRes.rows[0].id;
      await client.query('DELETE FROM condition_requirements WHERE condition_id = $1', [conditionId]);

      if (c.requirements.length > 0) {
        const reqValues = [];
        const reqParams = [];
        c.requirements.forEach((req, idx) => {
          const offset = idx * 6;
          reqValues.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
          reqParams.push(conditionId, req.kind, req.value, req.qty, req.mandatory, req.preference_order);
        });
        await client.query(`
          INSERT INTO condition_requirements (condition_id, kind, value, qty, mandatory, preference_order)
          VALUES ${reqValues.join(',\n')};
        `, reqParams);
      }
    }

    // 7. Seed 28 Days of Deterministic Hourly History (bed_flow_hourly)
    console.log('[Seed] Generating 28 days of deterministic hourly flow telemetry (high-speed SQL)...');
    await client.query(`
      INSERT INTO bed_flow_hourly (hospital_id, ward_type, hour_start, admissions, discharges)
      SELECT 
        h.id,
        w.ward_type,
        h_series.hour_start,
        GREATEST(0, (w.rate * (0.5 + 0.5 * sin(((EXTRACT(hour from h_series.hour_start) - 8) / 24.0) * 2 * pi())))::int),
        GREATEST(0, (w.rate * (0.5 + 0.5 * sin(((EXTRACT(hour from h_series.hour_start) - 11) / 24.0) * 2 * pi())))::int)
      FROM (SELECT id FROM hospitals LIMIT 5) h
      CROSS JOIN (
        VALUES 
          ('ICU'::varchar, 0.35), ('NICU'::varchar, 0.25), ('PICU'::varchar, 0.25), ('HDU'::varchar, 0.25), 
          ('CCU'::varchar, 0.25), ('EMERGENCY'::varchar, 1.2), ('GENERAL'::varchar, 1.8)
      ) AS w(ward_type, rate)
      CROSS JOIN generate_series(
        date_trunc('hour', NOW() - interval '28 days'),
        date_trunc('hour', NOW()),
        interval '1 hour'
      ) AS h_series(hour_start)
      ON CONFLICT (hospital_id, ward_type, hour_start) DO NOTHING;
    `);

    // Seed expected future discharges for the next 6 hours
    await client.query(`
      INSERT INTO expected_discharges (hospital_id, ward_type, expected_at)
      SELECT 
        h.id, 
        w.ward_type, 
        NOW() + (step.val || ' hours')::interval
      FROM (SELECT id FROM hospitals LIMIT 5) h
      CROSS JOIN (
        VALUES ('ICU'::varchar), ('HDU'::varchar), ('CCU'::varchar)
      ) AS w(ward_type)
      CROSS JOIN (VALUES (2), (4)) AS step(val)
      ON CONFLICT DO NOTHING;
    `);

    // 8. Blood banks — enable + stock by group/component for reception holds
    console.log('[Seed] Seeding hospital blood bank inventory...');
    const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const BLOOD_COMPONENTS = ['PRBC', 'WHOLE_BLOOD', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE'];

    await client.query(`
      UPDATE hospitals
      SET has_blood_bank = TRUE,
          blood_bank_phone = COALESCE(blood_bank_phone, phone),
          blood_bank_hours = COALESCE(blood_bank_hours, '24x7 Emergency · Crossmatch desk 8am–8pm'),
          facilities = CASE
            WHEN 'Blood Bank' = ANY(COALESCE(facilities, ARRAY[]::text[])) THEN facilities
            ELSE array_append(COALESCE(facilities, ARRAY[]::text[]), 'Blood Bank')
          END
      WHERE status = 'VERIFIED'
    `);

    for (let hi = 0; hi < hospitalIds.length; hi++) {
      const hid = hospitalIds[hi].id;
      // ~80% of hospitals keep a full blood bank; rest keep limited emergency stock
      const fullBank = hi % 5 !== 4;
      for (const bg of BLOOD_GROUPS) {
        for (const comp of BLOOD_COMPONENTS) {
          if (!fullBank && !['PRBC', 'FFP'].includes(comp)) continue;
          if (!fullBank && ['AB-', 'B-'].includes(bg)) continue;
          const base =
            comp === 'PRBC' ? 18 :
            comp === 'WHOLE_BLOOD' ? 8 :
            comp === 'FFP' ? 12 :
            comp === 'PLATELETS' ? 6 : 4;
          const units = Math.max(0, base + ((hi + bg.length + comp.length) % 7) - (fullBank ? 0 : 10));
          const reserved = units > 4 ? (hi % 3) : 0;
          const quarantine = units > 8 ? 1 : 0;
          const expiring = units > 6 ? Math.min(3, Math.floor(units / 8)) : 0;
          await client.query(
            `INSERT INTO blood_inventory (
               hospital_id, blood_group, component, units_total, units_reserved,
               units_quarantine, expiring_within_7d, version, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,NOW())
             ON CONFLICT (hospital_id, blood_group, component)
             DO UPDATE SET
               units_total = EXCLUDED.units_total,
               units_reserved = EXCLUDED.units_reserved,
               units_quarantine = EXCLUDED.units_quarantine,
               expiring_within_7d = EXCLUDED.expiring_within_7d,
               version = blood_inventory.version + 1,
               updated_at = NOW()`,
            [hid, bg, comp, units, reserved, quarantine, expiring]
          );
        }
      }
    }

    // 9. Curated medical knowledge for CityHealth AI RAG (FTS) — DEMO / reviewed snippets
    console.log('[Seed] Seeding CityHealth AI medical knowledge articles...');
    const KNOWLEDGE = [
      {
        title: 'Fever — when to seek care',
        category: 'GENERAL',
        source_name: 'National Health Portal / MoHFW (general education)',
        source_url: 'https://www.nhp.gov.in/',
        content:
          'Fever is a common response to infection. Rest, oral fluids, and temperature monitoring help for mild illness. Seek urgent care for fever with stiff neck, confusion, rash, difficulty breathing, seizures, or fever in infants. This is general education, not a diagnosis.',
      },
      {
        title: 'Chest pain — emergency guidance',
        category: 'EMERGENCY',
        source_name: 'Emergency first-aid education',
        source_url: null,
        content:
          'Sudden chest pain with shortness of breath, sweating, nausea, or pain radiating to arm/jaw may signal a cardiac emergency. Call 112 or go to the nearest emergency department immediately. Do not wait for an app assessment. Not a diagnosis.',
      },
      {
        title: 'Breathing difficulty — emergency guidance',
        category: 'EMERGENCY',
        source_name: 'Emergency first-aid education',
        source_url: null,
        content:
          'Severe breathing difficulty, inability to speak full sentences, blue lips, or sudden wheezing requires emergency care. Call 112. Prefer hospitals with Emergency / ICU / ventilator capability. Not a diagnosis.',
      },
      {
        title: 'Stroke warning signs (FAST)',
        category: 'EMERGENCY',
        source_name: 'Stroke awareness education',
        source_url: null,
        content:
          'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services. Sudden numbness, confusion, or severe headache also warrant emergency evaluation. Call 112. Seek hospitals with neurology / stroke-capable emergency care.',
      },
      {
        title: 'Dengue warning signs',
        category: 'INFECTIOUS',
        source_name: 'NVBDCP / dengue public guidance (general)',
        source_url: 'https://ncvbdc.mohfw.gov.in/',
        content:
          'Dengue may present with high fever, severe body ache, and headache. Warning signs include persistent vomiting, bleeding gums, severe abdominal pain, restlessness, or rapid drop in platelets. Seek hospital care promptly; severe cases may need HDU/ICU and blood bank support.',
      },
      {
        title: 'How GetMyHospital bed holds work',
        category: 'NAVIGATION',
        source_name: 'GetMyHospital product guidance',
        source_url: null,
        content:
          'Patients can place a short 15-minute bed hold at a verified hospital. This reserves inventory temporarily for reception to approve — it is not a permanent booking. Always confirm live ward availability in the app. In emergencies call 112 first.',
      },
      {
        title: 'Blood bank holds',
        category: 'NAVIGATION',
        source_name: 'GetMyHospital product guidance',
        source_url: null,
        content:
          'Blood units can be held for 30 minutes at participating hospital blood banks by blood group and component (PRBC, FFP, platelets, etc.). Hospital reception must approve and issue after crossmatch. Availability changes; never invent stock.',
      },
      {
        title: 'Dehydration and oral fluids',
        category: 'GENERAL',
        source_name: 'General public health education',
        source_url: null,
        content:
          'Mild dehydration from gastroenteritis often improves with oral rehydration solution (ORS) and small frequent sips. Seek care for inability to keep fluids down, blood in stool, high fever, confusion, or symptoms in infants/elderly. Not a prescription.',
      },
    ];

    for (const k of KNOWLEDGE) {
      await client.query(
        `INSERT INTO medical_knowledge (title, content, category, source_name, source_url, language, verification_status)
         SELECT $1::text, $2::text, $3::text, $4::text, $5::text, 'en', 'VERIFIED'
         WHERE NOT EXISTS (
           SELECT 1 FROM medical_knowledge WHERE title = $1::text AND verification_status = 'VERIFIED'
         )`,
        [k.title, k.content, k.category, k.source_name, k.source_url]
      );
    }

    await client.query('COMMIT');
    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Error during seeding:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
