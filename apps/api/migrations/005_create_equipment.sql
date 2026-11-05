-- 005_create_equipment.sql
-- Equipment registry per hospital and append-only lifecycle telemetry.

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(128),
    serial_no VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'FAULTY', 'OFFLINE')),
    available_at TIMESTAMPTZ,
    criticality VARCHAR(32) NOT NULL DEFAULT 'NORMAL'
        CHECK (criticality IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_hospital ON equipment(hospital_id, type, status);

-- Distributed Systems Note: Equipment state log provides immutable auditability.
-- If equipment fails or is decommissioned during an emergency, the state transition sequence
-- is verifiably preserved for clinical forensics and regulatory accountability.
CREATE TABLE IF NOT EXISTS equipment_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    old_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_status_log_time ON equipment_status_log(equipment_id, at DESC);

-- Trigger strictly preventing updates or deletions on equipment status log
DROP TRIGGER IF EXISTS trg_prevent_equipment_log_mutation ON equipment_status_log;
CREATE TRIGGER trg_prevent_equipment_log_mutation
    BEFORE UPDATE OR DELETE ON equipment_status_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_update_or_delete();

