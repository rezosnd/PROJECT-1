-- 019_doctor_profile.sql
-- Doctor self-service clinical profile (specialty, qualification, experience, etc.)

ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_qualification VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_degrees TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_experience_years INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_phone VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_clinic_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_consultation_fee NUMERIC(10, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_doctor_experience_years_check
    CHECK (doctor_experience_years IS NULL OR (doctor_experience_years >= 0 AND doctor_experience_years <= 60));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
