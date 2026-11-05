-- 007_create_bed_requests.sql
-- Bed reservation requests, hold deadlines, and triage lifecycle.

CREATE TABLE IF NOT EXISTS bed_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    ward_type VARCHAR(32) NOT NULL CHECK (
        ward_type IN ('ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'EMERGENCY', 'ISOLATION')
    ),
    urgency VARCHAR(32) NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL', 'URGENT', 'CRITICAL')),
    condition_id UUID REFERENCES conditions(id),
    note TEXT,
    share_abha BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ADMITTED')
    ),
    hold_expires_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id),
    reason TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bed_requests_patient ON bed_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_bed_requests_hospital ON bed_requests(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_bed_requests_hold_expiry ON bed_requests(hold_expires_at) WHERE status = 'PENDING';

