-- ══════════════════════════════════════════════════════════════════
-- Swarm ecosystem — combined, RE-RUNNABLE migration
-- Safe to run multiple times: tables use IF NOT EXISTS and every policy
-- is dropped before being recreated.
--   1. swarm_requests  → DELETE policy (delete own search history)
--   2. swarm_board     → shared "needs & offers" feed
--   3. swarm_auto_matches → proactive weekly pairings
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Allow users to delete their own swarm search history ─────────
DROP POLICY IF EXISTS "users delete own swarm requests" ON public.swarm_requests;
CREATE POLICY "users delete own swarm requests"
  ON public.swarm_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- ── 2. Crew Board ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swarm_board (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id     UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('need', 'offer')),
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS swarm_board_crew_idx
  ON public.swarm_board (crew_id, created_at DESC);

ALTER TABLE public.swarm_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew members read board" ON public.swarm_board;
CREATE POLICY "crew members read board"
  ON public.swarm_board FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_board.crew_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "crew members post to board" ON public.swarm_board;
CREATE POLICY "crew members post to board"
  ON public.swarm_board FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_board.crew_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "authors update own board posts" ON public.swarm_board;
CREATE POLICY "authors update own board posts"
  ON public.swarm_board FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "authors delete own board posts" ON public.swarm_board;
CREATE POLICY "authors delete own board posts"
  ON public.swarm_board FOR DELETE
  USING (auth.uid() = author_id);

-- ── 3. Auto-Match (proactive pairings) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.swarm_auto_matches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id     UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
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

DROP POLICY IF EXISTS "crew members read auto matches" ON public.swarm_auto_matches;
CREATE POLICY "crew members read auto matches"
  ON public.swarm_auto_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_auto_matches.crew_id
        AND cm.user_id = auth.uid()
    )
  );
