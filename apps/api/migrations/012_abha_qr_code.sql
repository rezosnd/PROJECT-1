-- Persist ABHA QR payload + image URL for fast profile/card rendering

ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS qr_payload TEXT;
ALTER TABLE abha_links ADD COLUMN IF NOT EXISTS qr_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_abha_links_qr ON abha_links ((qr_image_url IS NOT NULL));
