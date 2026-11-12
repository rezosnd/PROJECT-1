-- 015_blood_bank.sql
-- Hospital blood banks: stock by blood group + component, and patient hold requests for reception.

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS has_blood_bank BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blood_bank_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS blood_bank_hours VARCHAR(120);

-- Mark hospitals that already advertise Blood Bank facility
UPDATE hospitals
SET has_blood_bank = TRUE
WHERE has_blood_bank = FALSE
  AND facilities IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(facilities) f
    WHERE lower(f) LIKE '%blood bank%'
  );

CREATE TABLE IF NOT EXISTS blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group VARCHAR(8) NOT NULL
    CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component VARCHAR(32) NOT NULL DEFAULT 'PRBC'
    CHECK (component IN ('WHOLE_BLOOD', 'PRBC', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE')),
  units_total INTEGER NOT NULL DEFAULT 0 CHECK (units_total >= 0),
  units_reserved INTEGER NOT NULL DEFAULT 0 CHECK (units_reserved >= 0),
  units_quarantine INTEGER NOT NULL DEFAULT 0 CHECK (units_quarantine >= 0),
  expiring_within_7d INTEGER NOT NULL DEFAULT 0 CHECK (expiring_within_7d >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, blood_group, component),
  CHECK (units_reserved + units_quarantine <= units_total)
);

CREATE INDEX IF NOT EXISTS idx_blood_inventory_hospital ON blood_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_inventory_group ON blood_inventory(blood_group);

CREATE TABLE IF NOT EXISTS blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group VARCHAR(8) NOT NULL
    CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component VARCHAR(32) NOT NULL DEFAULT 'PRBC'
    CHECK (component IN ('WHOLE_BLOOD', 'PRBC', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE')),
  units_requested INTEGER NOT NULL DEFAULT 1 CHECK (units_requested > 0 AND units_requested <= 20),
  urgency VARCHAR(16) NOT NULL DEFAULT 'NORMAL'
    CHECK (urgency IN ('NORMAL', 'URGENT', 'CRITICAL')),
  reason TEXT,
  doctor_name VARCHAR(255),
  note TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'ISSUED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  hold_expires_at TIMESTAMPTZ,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  patient_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blood_requests_idempotency
  ON blood_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blood_requests_patient ON blood_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital ON blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
