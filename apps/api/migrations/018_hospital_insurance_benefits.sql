-- 018_hospital_insurance_benefits.sql
-- Hospital empanelment: benefits, patient discount %, and coverage notes.

ALTER TABLE hospital_insurers
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100);

ALTER TABLE hospital_insurers
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE hospital_insurers
  ADD COLUMN IF NOT EXISTS plan_label VARCHAR(255);

ALTER TABLE hospital_insurers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN hospital_insurers.discount_percent IS
  'Indicative cashless / package discount percent shown to patients (ops-configured).';
COMMENT ON COLUMN hospital_insurers.benefits IS
  'JSON array of benefit strings, e.g. ["Cashless IP","OPD cover","ICU included"].';
