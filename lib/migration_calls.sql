-- Internal calls (Daily.co rooms)
CREATE TABLE IF NOT EXISTS calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name     TEXT NOT NULL UNIQUE,          -- Daily.co room name
  room_url      TEXT NOT NULL,                 -- Daily.co room URL
  caller_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'ringing'  -- ringing | active | ended | declined | missed
                CHECK (status IN ('ringing','active','ended','declined','missed')),
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Both caller and callee can see/update the call
CREATE POLICY "calls_participants" ON calls FOR ALL
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE INDEX IF NOT EXISTS calls_callee_status_idx ON calls(callee_id, status);
CREATE INDEX IF NOT EXISTS calls_caller_idx ON calls(caller_id);

-- Enable Realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
