-- Dialect-Adaptive Intelligence (DAI) schema extensions
-- Run via: supabase db push OR paste into Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  domain TEXT DEFAULT 'general',
  speech_patterns JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  term TEXT NOT NULL,
  meaning TEXT,
  language TEXT,
  uses INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, term)
);

CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  summary TEXT,
  main_topics JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  key_decisions JSONB DEFAULT '[]',
  domain TEXT,
  session_quality JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE utterances ADD COLUMN IF NOT EXISTS emotional_tone TEXT;
ALTER TABLE utterances ADD COLUMN IF NOT EXISTS inferred_intent BOOLEAN DEFAULT FALSE;
ALTER TABLE utterances ADD COLUMN IF NOT EXISTS speaker_id INTEGER DEFAULT 0;
ALTER TABLE utterances ADD COLUMN IF NOT EXISTS alt_1 TEXT;
ALTER TABLE utterances ADD COLUMN IF NOT EXISTS alt_2 TEXT;
ALTER TABLE utterances ADD COLUMN IF NOT EXISTS coach_note JSONB;

CREATE OR REPLACE FUNCTION increment_vocab_uses(p_user_id TEXT, p_term TEXT)
RETURNS void AS $$
  UPDATE user_vocabulary SET uses = uses + 1, last_seen = NOW()
  WHERE user_id = p_user_id AND term = p_term;
$$ LANGUAGE sql;
