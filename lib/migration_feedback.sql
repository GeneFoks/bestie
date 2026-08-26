-- ============================================================================
-- BESTIE — in-app feedback
-- Stores every message; the API route also forwards each one to the founder's
-- inbox. Writes go through the service role only; no client policies needed.
-- Idempotent / safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email      TEXT,
  mood       TEXT,          -- love | idea | problem
  page       TEXT,          -- where in the app it was sent from
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
-- (intentionally NO client policies — the service role writes and reads)
