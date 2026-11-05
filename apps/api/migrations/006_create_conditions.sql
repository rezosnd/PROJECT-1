-- 006_create_conditions.sql
-- Medical conditions taxonomy and clinical capability mapping rules.

CREATE TABLE IF NOT EXISTS conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    icd10 VARCHAR(32),
    category VARCHAR(64) NOT NULL,
    severity_default VARCHAR(32) NOT NULL CHECK (severity_default IN ('NORMAL', 'URGENT', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_code ON conditions(code);
CREATE INDEX IF NOT EXISTS idx_conditions_aliases ON conditions USING GIN(aliases);

-- Defines required infrastructure per clinical condition
CREATE TABLE IF NOT EXISTS condition_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id UUID NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
    kind VARCHAR(32) NOT NULL CHECK (kind IN ('BED', 'EQUIPMENT', 'SPECIALTY', 'FACILITY')),
    value VARCHAR(128) NOT NULL,
    qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
    mandatory BOOLEAN NOT NULL DEFAULT true,
    preference_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condition_req_lookup ON condition_requirements(condition_id, kind);

