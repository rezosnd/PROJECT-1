-- 016_cityhealth_ai.sql
-- CityHealth AI: chat sessions, messages, curated medical knowledge (FTS), emergency events.

CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'or')),
  title VARCHAR(255),
  severity VARCHAR(16) NOT NULL DEFAULT 'NORMAL'
    CHECK (severity IN ('NORMAL', 'URGENT', 'CRITICAL')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  severity VARCHAR(16),
  tool_calls JSONB,
  tool_results JSONB,
  sources JSONB,
  hospitals JSONB,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS medical_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  source_name VARCHAR(255),
  source_url TEXT,
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  verification_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED'
    CHECK (verification_status IN ('DRAFT', 'VERIFIED', 'RETIRED')),
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_knowledge_fts ON medical_knowledge USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_category ON medical_knowledge(category);

CREATE OR REPLACE FUNCTION medical_knowledge_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_knowledge_fts ON medical_knowledge;
CREATE TRIGGER trg_medical_knowledge_fts
  BEFORE INSERT OR UPDATE ON medical_knowledge
  FOR EACH ROW EXECUTE FUNCTION medical_knowledge_search_vector_update();

CREATE TABLE IF NOT EXISTS emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE SET NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'CRITICAL',
  trigger_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'CLOSED')),
  recommended_hospitals JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON emergency_events(user_id, created_at DESC);
