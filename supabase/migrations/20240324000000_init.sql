-- Initial Schema for Multilingual Speech Web Application

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS utterances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  text_original TEXT NOT NULL,
  text_translated TEXT NOT NULL,
  language_code VARCHAR(10),
  confidence FLOAT DEFAULT 1.0,
  audio_url TEXT
);

-- Index for faster utterance lookup by session
CREATE INDEX IF NOT EXISTS idx_utterances_session_id ON utterances(session_id);
