-- Contact Import: store hashed phone/email for privacy-compliant friend matching
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hashed_email TEXT,                -- SHA-256 hex of lowercased trimmed email
  hashed_phone TEXT,                -- SHA-256 hex of E.164 phone (digits only)
  matched_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, hashed_email),
  UNIQUE (owner_id, hashed_phone)
);

ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their own rows
CREATE POLICY "user_contacts_owner" ON user_contacts
  FOR ALL USING (auth.uid() = owner_id);

-- Index for fast matching queries
CREATE INDEX IF NOT EXISTS user_contacts_email_idx ON user_contacts(hashed_email) WHERE hashed_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_contacts_phone_idx ON user_contacts(hashed_phone) WHERE hashed_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_contacts_owner_idx  ON user_contacts(owner_id);

-- Pre-hashed lookup columns on users table (so we can match inbound contacts without exposing raw data)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hashed_email TEXT,
  ADD COLUMN IF NOT EXISTS hashed_phone TEXT;

CREATE INDEX IF NOT EXISTS users_hashed_email_idx ON users(hashed_email) WHERE hashed_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_hashed_phone_idx ON users(hashed_phone) WHERE hashed_phone IS NOT NULL;
