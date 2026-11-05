-- 010_patient_profiles.sql
-- Patient clinical + booking profile collected on first login.

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_years INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(8) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check
      CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_blood_group_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_blood_group_check
      CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_age_years_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_age_years_check
      CHECK (age_years IS NULL OR (age_years >= 0 AND age_years <= 120));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(profile_complete);

ALTER TABLE bed_requests ADD COLUMN IF NOT EXISTS patient_snapshot JSONB;
