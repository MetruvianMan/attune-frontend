-- Attune Database Schema for Supabase (PostgreSQL)
-- Migration from SQLite to PostgreSQL

-- Enable UUID extension for generating IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Child Profiles
CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  alias TEXT,
  age INTEGER NOT NULL,
  diagnosis TEXT,
  intake_profile JSONB,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  severity INTEGER,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  persons JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  transcript TEXT,
  custom_label TEXT,
  custom_emoji TEXT,
  valence TEXT,
  context_entry_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  sequence_order INTEGER,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_child_profile ON events(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_synced ON events(synced);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Diary Entries
CREATE TABLE IF NOT EXISTS diary_entries (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  date BIGINT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  source TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_child_profile ON diary_entries(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_synced ON diary_entries(synced);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  child_profile_id TEXT REFERENCES child_profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  remote_url TEXT,
  file_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_child_profile ON photos(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_photos_synced ON photos(synced);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  source_provider TEXT,
  document_date BIGINT,
  file_path TEXT NOT NULL,
  remote_url TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_text TEXT,
  extraction_failed INTEGER NOT NULL DEFAULT 0,
  uploaded_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_documents_child_profile ON documents(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_synced ON documents(synced);

-- Relationship Persons
CREATE TABLE IF NOT EXISTS relationship_persons (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  role TEXT NOT NULL,
  relationship_strength INTEGER,
  photo_path TEXT,
  notes TEXT,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_relationship_persons_child_profile ON relationship_persons(child_profile_id);

-- Context Entries
CREATE TABLE IF NOT EXISTS context_entries (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  person_name TEXT,
  person_role TEXT,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  notes TEXT,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_context_entries_child_profile ON context_entries(child_profile_id);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  narrative TEXT NOT NULL,
  supporting_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score TEXT NOT NULL,
  explainability_statement TEXT NOT NULL,
  time_span_start BIGINT,
  time_span_end BIGINT,
  communication_scripts JSONB,
  strategy_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_insights_child_profile ON insights(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at DESC);

-- Strategies
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  insight_id TEXT NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source_document_ref TEXT,
  helped_count INTEGER NOT NULL DEFAULT 0,
  didnt_help_count INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strategies_child_profile ON strategies(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_strategies_insight ON strategies(insight_id);

-- Conversation Sessions
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL,
  last_activity_at BIGINT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  title TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_child_profile ON conversation_sessions(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions(last_activity_at DESC);

-- Glossary Terms
CREATE TABLE IF NOT EXISTS glossary_terms (
  term TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Quick Tap Buttons
CREATE TABLE IF NOT EXISTS quick_tap_buttons (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  order_index INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quick_tap_buttons_child_profile ON quick_tap_buttons(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_quick_tap_buttons_order ON quick_tap_buttons(order_index);

-- Sync Metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Voice Log Corrections (for ML training data)
CREATE TABLE IF NOT EXISTS voice_log_corrections (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  transcript_snippet TEXT NOT NULL,
  full_transcript TEXT NOT NULL,
  ai_event_type TEXT NOT NULL,
  ai_emoji TEXT NOT NULL,
  ai_valence TEXT NOT NULL,
  ai_description TEXT NOT NULL,
  user_event_type TEXT NOT NULL,
  user_emoji TEXT NOT NULL,
  user_valence TEXT NOT NULL,
  user_description TEXT,
  correction_type TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_log_corrections_child_profile ON voice_log_corrections(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_voice_log_corrections_created_at ON voice_log_corrections(created_at DESC);

-- Behaviors (Rewards System)
CREATE TABLE IF NOT EXISTS behaviors (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  point_value INTEGER NOT NULL,
  category TEXT NOT NULL,
  time_window_start TEXT,
  time_window_end TEXT,
  limit_frequency TEXT,
  limit_max_count INTEGER,
  exit_criteria TEXT,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_behaviors_child_profile ON behaviors(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_synced ON behaviors(synced);

-- Rewards (Rewards System)
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  point_cost INTEGER NOT NULL,
  availability_type TEXT,
  availability_consecutive_days INTEGER,
  parent_approval_required INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rewards_child_profile ON rewards(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_rewards_synced ON rewards(synced);

-- Point Events (Rewards System)
CREATE TABLE IF NOT EXISTS point_events (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  behavior_id TEXT REFERENCES behaviors(id) ON DELETE SET NULL,
  reward_id TEXT REFERENCES rewards(id) ON DELETE SET NULL,
  point_value INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  parent_id TEXT,
  created_at BIGINT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_point_events_child_profile ON point_events(child_profile_id);
CREATE INDEX IF NOT EXISTS idx_point_events_timestamp ON point_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_type ON point_events(type);
CREATE INDEX IF NOT EXISTS idx_point_events_synced ON point_events(synced);

-- Enable Row Level Security (RLS) on all tables
-- We'll configure the actual policies later after setting up authentication

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_tap_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_log_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (we'll refine these later with proper auth)
-- For initial setup, allow all operations (you'll want to restrict this in production)

CREATE POLICY "Enable all operations for now" ON child_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON diary_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON relationship_persons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON context_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON insights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON strategies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON conversation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON glossary_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON quick_tap_buttons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON sync_metadata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON voice_log_corrections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON behaviors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for now" ON point_events FOR ALL USING (true) WITH CHECK (true);
