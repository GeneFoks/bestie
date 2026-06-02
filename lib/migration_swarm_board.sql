-- ══════════════════════════════════════════════════════════════════
-- Swarm Board — shared "needs & offers" feed for a Crew
-- Everyone in the crew sees what others are looking for / offering.
-- ══════════════════════════════════════════════════════════════════

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

-- Crew members can read the whole board
CREATE POLICY "crew members read board"
  ON public.swarm_board FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_board.crew_id
        AND cm.user_id = auth.uid()
    )
  );

-- Crew members can post (as themselves)
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

-- Authors can edit (e.g. mark closed) their own posts
CREATE POLICY "authors update own board posts"
  ON public.swarm_board FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "authors delete own board posts"
  ON public.swarm_board FOR DELETE
  USING (auth.uid() = author_id);
