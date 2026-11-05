-- ABHA photo + extended demographics on linkage and user profile

ALTER TABLE users ADD COLUMN IF NOT EXISTS abha_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20);

ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS gender VARCHAR(16);
ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
