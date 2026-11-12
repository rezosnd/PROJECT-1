-- 017_ambulance_sos.sql
-- Ambulance role, fleet registry, SOS dispatch (FCFS), and push device tokens.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('PATIENT', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN', 'DOCTOR', 'AMBULANCE'));

ALTER TABLE preregistered_staff DROP CONSTRAINT IF EXISTS preregistered_staff_role_check;
ALTER TABLE preregistered_staff ADD CONSTRAINT preregistered_staff_role_check
  CHECK (role IN ('HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'DOCTOR', 'AMBULANCE'));

ALTER TABLE preregistered_staff ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(64);
ALTER TABLE preregistered_staff ADD COLUMN IF NOT EXISTS ambulance_type VARCHAR(32);

-- Live ambulance / EMS units operating in the city
CREATE TABLE IF NOT EXISTS ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  call_sign VARCHAR(64) NOT NULL,
  vehicle_no VARCHAR(64) NOT NULL,
  ambulance_type VARCHAR(32) NOT NULL DEFAULT 'ALS'
    CHECK (ambulance_type IN ('BLS', 'ALS', 'ICU', 'NEONATAL', 'AIR')),
  phone VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE'
    CHECK (status IN ('AVAILABLE', 'BUSY', 'EN_ROUTE', 'OFFLINE')),
  location GEOGRAPHY(POINT, 4326),
  last_location_at TIMESTAMPTZ,
  city VARCHAR(120) NOT NULL DEFAULT 'Bhubaneswar',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ambulances_location ON ambulances USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_ambulances_hospital ON ambulances(hospital_id);

-- Patient SOS requests — first ambulance to accept wins
CREATE TABLE IF NOT EXISTS sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  severity VARCHAR(16) NOT NULL DEFAULT 'CRITICAL'
    CHECK (severity IN ('URGENT', 'CRITICAL')),
  note TEXT,
  patient_phone VARCHAR(32),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text TEXT,
  search_radius_m INTEGER NOT NULL DEFAULT 15000,
  notified_count INTEGER NOT NULL DEFAULT 0,
  accepted_ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
  accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  destination_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_requests_patient ON sos_requests(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON sos_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_requests_open ON sos_requests(created_at DESC) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_sos_requests_location ON sos_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_sos_requests_ambulance ON sos_requests(accepted_ambulance_id);

-- Which units were pinged for a given SOS (audit + UI)
CREATE TABLE IF NOT EXISTS sos_dispatch_targets (
  sos_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  ambulance_id UUID NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
  distance_m DOUBLE PRECISION,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  push_sent BOOLEAN NOT NULL DEFAULT FALSE,
  seen_at TIMESTAMPTZ,
  PRIMARY KEY (sos_id, ambulance_id)
);

CREATE INDEX IF NOT EXISTS idx_sos_dispatch_ambulance ON sos_dispatch_targets(ambulance_id, notified_at DESC);

-- Push tokens (Expo + FCM) for instant SOS alerts
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  provider VARCHAR(16) NOT NULL DEFAULT 'EXPO'
    CHECK (provider IN ('EXPO', 'FCM', 'APNS')),
  platform VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (platform IN ('IOS', 'ANDROID', 'WEB', 'UNKNOWN')),
  app_slug VARCHAR(64),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON device_push_tokens(user_id);
