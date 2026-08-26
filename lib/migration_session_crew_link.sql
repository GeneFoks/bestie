-- ============================================================================
-- BESTIE — attach an existing group session to a crew/camp
-- The host links a session from its Edit page; it then shows in the crew
-- page's "Sessions" section (e.g. a Burning Man camp's happenings).
-- Idempotent / safe to re-run.
-- ============================================================================

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_sessions_crew ON public.group_sessions(crew_id);
