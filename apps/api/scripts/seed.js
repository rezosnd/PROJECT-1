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

const HOSPITAL_TEMPLATES = [
  { name: 'AIIMS Bhubaneswar', type: 'GOVERNMENT', pin: '751019', latOffset: 0.000, lngOffset: 0.000, trauma: 3, phone: '+91-674-2476789', email: 'emergency@aiimsbhubaneswar.edu.in' },
  { name: 'KIMS Hospital & Medical College', type: 'PRIVATE', pin: '751024', latOffset: 0.025, lngOffset: -0.015, trauma: 3, phone: '+91-674-7105300', email: 'helpdesk@kims.ac.in' },
  { name: 'SUM Ultimate Medicare', type: 'PRIVATE', pin: '751003', latOffset: -0.018, lngOffset: 0.022, trauma: 3, phone: '+91-674-3500500', email: 'care@sumum.com' },
  { name: 'Capital Hospital (Govt)', type: 'GOVERNMENT', pin: '751001', latOffset: -0.010, lngOffset: -0.010, trauma: 2, phone: '+91-674-2391983', email: 'capitalhosp.bbsr@gov.in' },
  { name: 'Apollo Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751005', latOffset: 0.015, lngOffset: 0.030, trauma: 3, phone: '+91-674-6661066', email: 'emergency.bbsr@apollohospitals.com' },
  { name: 'AMRI Hospital Bhubaneswar', type: 'PRIVATE', pin: '751030', latOffset: -0.035, lngOffset: -0.020, trauma: 2, phone: '+91-674-6666600', email: 'info.bbsr@amrihospitals.in' },
  { name: 'Care Hospitals Bhubaneswar', type: 'PRIVATE', pin: '751016', latOffset: 0.032, lngOffset: 0.012, trauma: 2, phone: '+91-674-3011500', email: 'info.bbsr@carehospitals.com' },
  { name: 'Hi-Tech Medical College & Hospital', type: 'PRIVATE', pin: '751025', latOffset: 0.040, lngOffset: -0.005, trauma: 2, phone: '+91-674-2371217', email: 'info@hi-techmedical.org' },
  { name: 'Utkal Hospital Bhubaneswar', type: 'PRIVATE', pin: '751023', latOffset: 0.028, lngOffset: 0.025, trauma: 2, phone: '+91-674-6681000', email: 'contact@utkalhospital.com' },
  { name: 'Sparsh Hospitals & Critical Care', type: 'PRIVATE', pin: '751007', latOffset: -0.022, lngOffset: -0.012, trauma: 2, phone: '+91-674-6626666', email: 'sparsh.care@sparshhospital.com' },
  { name: 'Sunshine Hospital Bhubaneswar', type: 'PRIVATE', pin: '751010', latOffset: -0.005, lngOffset: 0.035, trauma: 1, phone: '+91-674-2567890', email: 'contact@sunshinebbsr.com' },
  { name: 'Blue Wheel Hospital', type: 'PRIVATE', pin: '751017', latOffset: 0.018, lngOffset: -0.028, trauma: 1, phone: '+91-674-2747444', email: 'info@bluewheelhospital.com' },
  { name: 'Kar Clinic & Hospital', type: 'PRIVATE', pin: '751001', latOffset: -0.012, lngOffset: 0.005, trauma: 1, phone: '+91-674-2534888', email: 'info@karclinic.com' },
  { name: 'Ayush Hospitals & Trauma Centre', type: 'PRIVATE', pin: '751014', latOffset: -0.030, lngOffset: 0.015, trauma: 2, phone: '+91-674-7111100', email: 'emergency@ayushhospitals.com' },
  { name: 'Neelachal Hospital', type: 'PRIVATE', pin: '751001', latOffset: -0.008, lngOffset: -0.018, trauma: 1, phone: '+91-674-2536590', email: 'care@neelachalhospital.in' },
  { name: 'BMC City Maternity & Pediatric Centre', type: 'GOVERNMENT', pin: '751009', latOffset: -0.015, lngOffset: -0.025, trauma: 1, phone: '+91-674-2431200', email: 'bmc.health@gov.in' },
  { name: 'Kalinga Hospital', type: 'TRUST', pin: '751023', latOffset: 0.022, lngOffset: 0.018, trauma: 2, phone: '+91-674-2300570', email: 'info@kalingahospital.com' },
  { name: 'Vivekananda Hospital', type: 'PRIVATE', pin: '751003', latOffset: -0.025, lngOffset: 0.008, trauma: 1, phone: '+91-674-2595200', email: 'admin@vivekanandahospital.com' },
  { name: 'Institute of Medical Sciences & SUM Hospital (Campus 1)', type: 'PRIVATE', pin: '751003', latOffset: -0.020, lngOffset: 0.020, trauma: 3, phone: '+91-674-2386292', email: 'ims@soa.ac.in' },
  { name: 'Aditya Care Hospital', type: 'PRIVATE', pin: '751016', latOffset: 0.030, lngOffset: 0.010, trauma: 2, phone: '+91-674-3053200', email: 'contact@adityacare.com' },
  { name: 'Panda Curative & Cardiac Hospital', type: 'PRIVATE', pin: '751012', latOffset: 0.012, lngOffset: -0.022, trauma: 2, phone: '+91-674-2390111', email: 'info@pandacurative.com' },
  { name: 'Hemalata Cancer & Multi-Specialty Hospital', type: 'PRIVATE', pin: '751023', latOffset: 0.026, lngOffset: 0.032, trauma: 1, phone: '+91-674-2302444', email: 'hemalatacancer@gmail.com' },
  { name: 'Bhubaneswar Trauma & Orthopedic Centre', type: 'PRIVATE', pin: '751007', latOffset: -0.019, lngOffset: -0.008, trauma: 2, phone: '+91-674-2571234', email: 'traumacare@btoc.org' },
  { name: 'ESIC Model Hospital Bhubaneswar', type: 'GOVERNMENT', pin: '751022', latOffset: 0.016, lngOffset: -0.012, trauma: 2, phone: '+91-674-2540024', email: 'ms-odisha@esic.nic.in' },
  { name: 'Ewam Multi-Specialty Hospital', type: 'PRIVATE', pin: '751019', latOffset: 0.005, lngOffset: 0.020, trauma: 1, phone: '+91-674-2471199', email: 'help@ewamhospital.com' }
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
  console.log('[Seed] Seeding synthetic data for Bhubaneswar health network...');
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

    // 2. Seed 25 Synthetic Hospitals around Bhubaneswar (Lat: 20.2961, Lng: 85.8245)
    console.log(`[Seed] Creating ${HOSPITAL_TEMPLATES.length} synthetic hospitals...`);
    const baseLat = 20.2961;
    const baseLng = 85.8245;
    const hospitalIds = [];
    const allBedRows = [];
    const allEqRows = [];

    for (let i = 0; i < HOSPITAL_TEMPLATES.length; i++) {
      const h = HOSPITAL_TEMPLATES[i];
      const lat = baseLat + h.latOffset;
      const lng = baseLng + h.lngOffset;
      const regNo = `OD-BBSR-2026-${String(i + 1).padStart(4, '0')}`;
      const address = `${h.name} Campus, Sector ${i + 1}, Patia / Khandagiri corridor, Bhubaneswar, Odisha`;
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
          location = EXCLUDED.location,
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

      // Bed Inventory for all 10 ward types for each hospital
      for (const wardType of WARD_TYPES) {
        let total = 20;
        let occupied = 12;
        let reserved = 2;
        let cleaning = 1;
        let maintenance = 0;
        let ventBeds = 0;

        if (wardType === 'ICU') {
          total = h.trauma === 3 ? 30 : 15;
          occupied = Math.floor(total * 0.65);
          reserved = 2;
          cleaning = 1;
          ventBeds = total;
        } else if (wardType === 'NICU' || wardType === 'PICU') {
          total = h.trauma >= 2 ? 16 : 8;
          occupied = Math.floor(total * 0.6);
          reserved = 1;
          ventBeds = 4;
        } else if (wardType === 'GENERAL') {
          total = 100;
          occupied = 70;
          reserved = 5;
          cleaning = 4;
          maintenance = 1;
        } else if (wardType === 'EMERGENCY') {
          total = 25;
          occupied = 14;
          reserved = 3;
          cleaning = 2;
          ventBeds = 6;
        } else if (wardType === 'HDU' || wardType === 'CCU') {
          total = 20;
          occupied = 12;
          reserved = 2;
          cleaning = 1;
          ventBeds = 10;
        } else if (wardType === 'ISOLATION') {
          total = 12;
          occupied = 6;
          reserved = 1;
          cleaning = 1;
          ventBeds = 6;
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

    // 5. Seed Pre-registered Staff for the first two hospitals
    if (hospitalIds.length >= 2) {
      console.log('[Seed] Setting up sample pre-registered staff...');
      const sampleStaff = [
        { email: 'staff.aiims@gmail.com', role: 'HOSPITAL_STAFF', hospitalId: hospitalIds[0].id },
        { email: 'admin.aiims@gmail.com', role: 'HOSPITAL_ADMIN', hospitalId: hospitalIds[0].id },
        { email: 'staff.kims@gmail.com', role: 'HOSPITAL_STAFF', hospitalId: hospitalIds[1].id },
        { email: 'admin.kims@gmail.com', role: 'HOSPITAL_ADMIN', hospitalId: hospitalIds[1].id }
      ];

      for (const s of sampleStaff) {
        await client.query(`
          INSERT INTO preregistered_staff (email, role, hospital_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (email)
          DO UPDATE SET role = EXCLUDED.role, hospital_id = EXCLUDED.hospital_id;
        `, [s.email.toLowerCase(), s.role, s.hospitalId]);
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
