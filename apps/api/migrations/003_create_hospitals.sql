-- 003_create_hospitals.sql
-- Hospital directory with geospatial indexing for proximity routing and tenant isolation.

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    registration_no VARCHAR(128) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL,
    pin VARCHAR(20) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email CITEXT NOT NULL,
    emergency_24x7 BOOLEAN NOT NULL DEFAULT true,
    trauma_level SMALLINT NOT NULL DEFAULT 0 CHECK (trauma_level BETWEEN 0 AND 3),
    specialties TEXT[] NOT NULL DEFAULT '{}',
    facilities TEXT[] NOT NULL DEFAULT '{}',
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg BETWEEN 0.00 AND 5.00),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Distributed Systems Note: Spatial GiST index enables sub-millisecond nearest-neighbor (kNN) queries
-- across distributed geographic partitions without table-scan penalties.
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);

-- Foreign key constraints linking users and staff to hospitals
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_hospital'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_hospital 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_preregistered_staff_hospital'
    ) THEN
        ALTER TABLE preregistered_staff 
        ADD CONSTRAINT fk_preregistered_staff_hospital 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;
    END IF;
END $$;

