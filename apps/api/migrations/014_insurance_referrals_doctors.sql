-- 014_insurance_referrals_doctors.sql
-- Doctor role, insurers, patient insurance, hospital networks, patient QR, clinical referrals.

-- Expand users.role to include DOCTOR
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('PATIENT', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN', 'DOCTOR'));

-- Doctors may be affiliated with a hospital (optional for independent referrers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_specialty VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_license_no VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_qr_token UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_qr_payload TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_qr_image_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_patient_qr_token
  ON users(patient_qr_token) WHERE patient_qr_token IS NOT NULL;

-- Expand preregistered_staff for doctors
ALTER TABLE preregistered_staff DROP CONSTRAINT IF EXISTS preregistered_staff_role_check;
ALTER TABLE preregistered_staff ADD CONSTRAINT preregistered_staff_role_check
  CHECK (role IN ('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'DOCTOR'));
ALTER TABLE preregistered_staff ALTER COLUMN hospital_id DROP NOT NULL;
ALTER TABLE preregistered_staff ADD COLUMN IF NOT EXISTS specialty VARCHAR(120);
ALTER TABLE preregistered_staff ADD COLUMN IF NOT EXISTS license_no VARCHAR(64);

-- Catalog of insurers (India-focused demo set)
CREATE TABLE IF NOT EXISTS insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'PRIVATE'
    CHECK (type IN ('GOVERNMENT', 'PRIVATE', 'CORPORATE', 'SCHEME')),
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  policy_number VARCHAR(120),
  member_id VARCHAR(120),
  plan_name VARCHAR(255),
  valid_until DATE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, insurer_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id);

-- Which insurers a hospital accepts (cashless / empanelled)
CREATE TABLE IF NOT EXISTS hospital_insurers (
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  cashless BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  PRIMARY KEY (hospital_id, insurer_id)
);

CREATE INDEX IF NOT EXISTS idx_hospital_insurers_insurer ON hospital_insurers(insurer_id);

-- Clinical departments within hospitals (for doctor referrals)
CREATE TABLE IF NOT EXISTS hospital_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(120),
  ward_hint VARCHAR(32),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hospital_departments_hospital ON hospital_departments(hospital_id);

-- Doctor → hospital / department referrals (scanned from patient QR)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  to_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  to_department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
  condition_id UUID REFERENCES conditions(id) ON DELETE SET NULL,
  urgency VARCHAR(16) NOT NULL DEFAULT 'NORMAL'
    CHECK (urgency IN ('NORMAL', 'URGENT', 'CRITICAL')),
  reason TEXT,
  clinical_notes TEXT,
  recommended_ward VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT', 'ACKNOWLEDGED', 'HOLD_CREATED', 'COMPLETED', 'CANCELLED')),
  bed_request_id UUID REFERENCES bed_requests(id) ON DELETE SET NULL,
  patient_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON referrals(doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_to_hospital ON referrals(to_hospital_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
