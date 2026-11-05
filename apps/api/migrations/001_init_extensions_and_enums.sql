-- 001_init_extensions_and_enums.sql
-- Enables core PostgreSQL extensions and defines shared triggers and check domains.

-- Extension for spatial queries (PostGIS geography for hospital distances)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Extension for cryptographic functions (UUID generation, hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Extension for case-insensitive text (email comparisons)
CREATE EXTENSION IF NOT EXISTS citext;

-- Distributed Systems Note: Append-only ledgers and audit tables require absolute
-- immutability to provide verifiable event sourcing and non-repudiation.
-- We enforce this at the database engine level via this trigger function.
CREATE OR REPLACE FUNCTION prevent_update_or_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is an append-only ledger: UPDATE and DELETE operations are strictly prohibited.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

