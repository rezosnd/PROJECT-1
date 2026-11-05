-- 008_create_abha.sql
-- Ayushman Bharat Health Account (ABHA/ABDM) linkage and consent governance.

CREATE TABLE IF NOT EXISTS abha_links (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    abha_number_enc BYTEA NOT NULL,
    abha_number_hash VARCHAR(64) UNIQUE NOT NULL,
    abha_address VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'LINKED' CHECK (status IN ('LINKED', 'UNLINKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abha_links_hash ON abha_links(abha_number_hash);
CREATE INDEX IF NOT EXISTS idx_abha_links_address ON abha_links(abha_address);

-- User-granted consents for ABDM health information exchange
CREATE TABLE IF NOT EXISTS abha_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abha_consents_user ON abha_consents(user_id, granted_at DESC);

