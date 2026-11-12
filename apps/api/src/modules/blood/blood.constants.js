export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BLOOD_COMPONENTS = [
  { code: 'PRBC', label: 'Packed RBC', short: 'PRBC' },
  { code: 'WHOLE_BLOOD', label: 'Whole blood', short: 'Whole' },
  { code: 'FFP', label: 'Fresh frozen plasma', short: 'FFP' },
  { code: 'PLATELETS', label: 'Platelets', short: 'Plt' },
  { code: 'CRYOPRECIPITATE', label: 'Cryoprecipitate', short: 'Cryo' },
];

export const BLOOD_HOLD_MINUTES = 30;

/** Compatible donor groups for a recipient (simplified clinical crossmatch guide). */
export const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
};
