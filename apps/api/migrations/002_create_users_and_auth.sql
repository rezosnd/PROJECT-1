-- 002_create_users_and_auth.sql
-- Users, pre-registered staff assignments, and rotating refresh tokens with reuse detection.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub VARCHAR(255) UNIQUE,
    email CITEXT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    role VARCHAR(32) NOT NULL DEFAULT 'PATIENT' 
        CHECK (role IN ('PATIENT', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN')),
    hospital_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);

-- Distributed Systems Note: Role assignments for staff are pre-registered by CITY_ADMIN.
-- When the staff member signs in via Google OAuth for the first time, this record is consumed
-- in a single atomic transaction, guaranteeing deterministic role assumption without manual verification delays.
CREATE TABLE IF NOT EXISTS preregistered_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('HOSPITAL_ADMIN', 'HOSPITAL_STAFF')),
    hospital_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preregistered_staff_email ON preregistered_staff(email);

-- Distributed Systems Note: Token Rotation & Family Reuse Detection.
-- Refresh tokens are stored strictly as SHA-256 hashes. Each token belongs to a family_id.
-- If an already-revoked refresh token is replayed (indicating interception over an insecure link or client compromise),
-- the entire family is immediately revoked, isolating the breach.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

