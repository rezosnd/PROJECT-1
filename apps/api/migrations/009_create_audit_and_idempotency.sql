-- 009_create_audit_and_idempotency.sql
-- Immutable system audit trails and distributed idempotency registry.

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    ip VARCHAR(64),
    meta JSONB,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, at DESC);

-- Trigger strictly preventing updates or deletions on audit logs
DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON audit_log;
CREATE TRIGGER trg_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_update_or_delete();

-- Distributed Systems Note: Network partitions, client timeouts, and automatic retry policies
-- can cause duplicate POST/mutation requests. The idempotency registry stores the final outcome
-- of a successful mutation keyed by a client-provided UUID or unique string.
-- Subsequent identical requests are served directly from this table, achieving exactly-once semantics.
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    user_id UUID,
    route VARCHAR(255) NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);

