-- ══════════════════════════════════════════════════════════════════
-- Swarm Auto-Match — proactive pairings suggested by the swarm
-- Tracks pairs already suggested so we never nudge the same two people
-- about each other twice.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.swarm_auto_matches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id     UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  -- user_a / user_b are stored with user_a < user_b (text sort) so each
  -- unordered pair maps to exactly one row.
  user_a      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason      TEXT,
  score       INT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (crew_id, user_a, user_b)
);

CREATE INDEX IF NOT EXISTS swarm_auto_matches_crew_idx
  ON public.swarm_auto_matches (crew_id, created_at DESC);

ALTER TABLE public.swarm_auto_matches ENABLE ROW LEVEL SECURITY;

-- Members can read suggestions involving their crew
CREATE POLICY "crew members read auto matches"
  ON public.swarm_auto_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_auto_matches.crew_id
        AND cm.user_id = auth.uid()
    )
  );

-- Writes happen only from the service role (scheduled job), so no
-- INSERT/UPDATE/DELETE policies are granted to regular users.
