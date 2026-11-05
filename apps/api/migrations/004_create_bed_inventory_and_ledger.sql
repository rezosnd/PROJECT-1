-- 004_create_bed_inventory_and_ledger.sql
-- Real-time bed inventory with derived-free constraints, optimistic concurrency versioning, and immutable audit ledger.

CREATE TABLE IF NOT EXISTS bed_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_type VARCHAR(32) NOT NULL CHECK (
        ward_type IN ('ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'EMERGENCY', 'ISOLATION')
    ),
    total INT NOT NULL DEFAULT 0,
    occupied INT NOT NULL DEFAULT 0,
    reserved INT NOT NULL DEFAULT 0,
    cleaning INT NOT NULL DEFAULT 0,
    maintenance INT NOT NULL DEFAULT 0,
    has_ventilator_beds INT NOT NULL DEFAULT 0,
    -- Distributed Systems Note: Optimistic concurrency control. The version column
    -- guarantees that concurrent updates from multiple station dashboards can be detected
    -- and sequenced without lost updates.
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hospital_ward UNIQUE (hospital_id, ward_type),
    -- Distributed Systems Note: Free beds are strictly derived (total - occupied - reserved - cleaning - maintenance).
    -- By enforcing non-negativity and total bounds at the DB constraint level, we prevent invariant violation
    -- even under extreme concurrent race conditions.
    CONSTRAINT chk_bed_counts_non_negative CHECK (
        total >= 0 AND
        occupied >= 0 AND
        reserved >= 0 AND
        cleaning >= 0 AND
        maintenance >= 0 AND
        has_ventilator_beds >= 0 AND
        has_ventilator_beds <= total
    ),
    CONSTRAINT chk_bed_sum_within_total CHECK (
        (occupied + reserved + cleaning + maintenance) <= total
    )
);

CREATE INDEX IF NOT EXISTS idx_bed_inventory_lookup ON bed_inventory(hospital_id, ward_type);

-- Distributed Systems Note: Append-only ledger pattern.
-- Instead of overwriting history, every inventory adjustment emits a ledger record.
-- If the state of bed inventory is ever disputed in an audit or crash recovery, it can be mathematically
-- reconstructed by summing deltas from genesis.
CREATE TABLE IF NOT EXISTS bed_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_type VARCHAR(32) NOT NULL,
    field VARCHAR(32) NOT NULL CHECK (field IN ('total', 'occupied', 'reserved', 'cleaning', 'maintenance', 'has_ventilator_beds')),
    delta INT NOT NULL,
    reason TEXT,
    actor_id UUID,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bed_ledger_hospital_ward ON bed_ledger(hospital_id, ward_type, at DESC);

-- Trigger strictly preventing updates or deletions on the bed ledger
DROP TRIGGER IF EXISTS trg_prevent_bed_ledger_mutation ON bed_ledger;
CREATE TRIGGER trg_prevent_bed_ledger_mutation
    BEFORE UPDATE OR DELETE ON bed_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_update_or_delete();

-- Distributed Systems Note: Periodic point-in-time snapshots for fast time-series analysis and forecasting.
CREATE TABLE IF NOT EXISTS bed_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_type VARCHAR(32) NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total INT NOT NULL,
    occupied INT NOT NULL,
    reserved INT NOT NULL,
    free INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bed_snapshots_non_negative CHECK (total >= 0 AND occupied >= 0 AND reserved >= 0 AND free >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bed_snapshots_time ON bed_snapshots(hospital_id, ward_type, at DESC);

-- Flow tracking for hourly admissions and discharges (basis for 1h/3h/6h availability prediction)
CREATE TABLE IF NOT EXISTS bed_flow_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_type VARCHAR(32) NOT NULL,
    hour_start TIMESTAMPTZ NOT NULL,
    admissions INT NOT NULL DEFAULT 0,
    discharges INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bed_flow_hourly UNIQUE (hospital_id, ward_type, hour_start)
);

CREATE INDEX IF NOT EXISTS idx_bed_flow_hourly_hour ON bed_flow_hourly(hospital_id, ward_type, hour_start DESC);

-- Expected discharges logged by medical staff for predictive queueing
CREATE TABLE IF NOT EXISTS expected_discharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_type VARCHAR(32) NOT NULL,
    expected_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expected_discharges_lookup ON expected_discharges(hospital_id, ward_type, expected_at);

