-- BESTIE — Phase 5: Discovery & Growth
-- Aggregate Bestie Type per crew, crew-only activity packages, cross-crew events.
-- Run in Supabase SQL editor.

-- ==========================================
-- 1. AGGREGATE BESTIE TYPE per crew
-- For each crew we pick the MODE (most common value) of energy/mind/vibe
-- among members who have completed the quiz. The view also returns the
-- counts so the UI can show "5 / 8 members confirmed".
-- ==========================================

CREATE OR REPLACE VIEW public.crew_aggregate_type AS
WITH typed_members AS (
  SELECT
    cm.crew_id,
    u.energy_type,
    u.mind_type,
    u.vibe_type
  FROM public.crew_members cm
  JOIN public.users u ON u.id = cm.user_id
  WHERE u.bestie_type_completed = TRUE
    AND u.energy_type IS NOT NULL
),
energy_mode AS (
  SELECT crew_id, energy_type,
         ROW_NUMBER() OVER (PARTITION BY crew_id ORDER BY COUNT(*) DESC, energy_type) AS rn
  FROM typed_members
  GROUP BY crew_id, energy_type
),
mind_mode AS (
  SELECT crew_id, mind_type,
         ROW_NUMBER() OVER (PARTITION BY crew_id ORDER BY COUNT(*) DESC, mind_type) AS rn
  FROM typed_members
  GROUP BY crew_id, mind_type
),
vibe_mode AS (
  SELECT crew_id, vibe_type,
         ROW_NUMBER() OVER (PARTITION BY crew_id ORDER BY COUNT(*) DESC, vibe_type) AS rn
  FROM typed_members
  GROUP BY crew_id, vibe_type
),
member_count AS (
  SELECT crew_id, COUNT(*) AS typed_count
  FROM typed_members
  GROUP BY crew_id
)
SELECT
  c.id                                  AS crew_id,
  COALESCE(em.energy_type, NULL)       AS energy_type,
  COALESCE(mm.mind_type,   NULL)       AS mind_type,
  COALESCE(vm.vibe_type,   NULL)       AS vibe_type,
  COALESCE(mc.typed_count, 0)::INTEGER AS typed_members
FROM public.crews c
LEFT JOIN energy_mode em ON em.crew_id = c.id AND em.rn = 1
LEFT JOIN mind_mode   mm ON mm.crew_id = c.id AND mm.rn = 1
LEFT JOIN vibe_mode   vm ON vm.crew_id = c.id AND vm.rn = 1
LEFT JOIN member_count mc ON mc.crew_id = c.id;

-- ==========================================
-- 2. CREW-ONLY ACTIVITY PACKAGES
-- A package can be marked as exclusive to a crew. When booking, the
-- system blocks non-members. Reuses existing activity_packages with a
-- nullable crew_id column.
-- ==========================================

ALTER TABLE public.activity_packages
  ADD COLUMN IF NOT EXISTS crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_packages_crew ON public.activity_packages(crew_id);

-- Only crew members can read crew-locked packages
DROP POLICY IF EXISTS "Read activity packages" ON public.activity_packages;
CREATE POLICY "Read activity packages"
  ON public.activity_packages FOR SELECT USING (
    crew_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = activity_packages.crew_id AND cm.user_id = auth.uid()
    )
  );

-- ==========================================
-- 3. CROSS-CREW EVENTS (co-hosts)
-- An event can be co-hosted by multiple crews. Members of any co-host
-- crew see the event in their crew page and can RSVP if members_only=true.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crew_event_co_hosts (
  event_id  UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  crew_id   UUID REFERENCES public.crews(id)        ON DELETE CASCADE NOT NULL,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_event_co_hosts_crew ON public.crew_event_co_hosts(crew_id);

ALTER TABLE public.crew_event_co_hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read co-hosts"
  ON public.crew_event_co_hosts FOR SELECT USING (TRUE);

-- Only the host (captain of the event's primary crew) can add or remove co-hosts
CREATE POLICY "Captain manages co-hosts"
  ON public.crew_event_co_hosts FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_events e
      JOIN public.crews c ON c.id = e.crew_id
      WHERE e.id = event_id AND c.captain_id = auth.uid()
    )
  );

CREATE POLICY "Captain removes co-hosts"
  ON public.crew_event_co_hosts FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.crew_events e
      JOIN public.crews c ON c.id = e.crew_id
      WHERE e.id = event_id AND c.captain_id = auth.uid()
    )
  );

-- Extend the members-only RSVP policy: members of ANY co-host crew can join
-- (we keep the existing 'Members can join members-only events' policy and
-- ADD an alternative)
CREATE POLICY "Co-host members can join members-only events"
  ON public.crew_event_attendees FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_events e
      JOIN public.crew_event_co_hosts ch ON ch.event_id = e.id
      JOIN public.crew_members cm        ON cm.crew_id  = ch.crew_id
      WHERE e.id = event_id
        AND e.is_members_only = TRUE
        AND cm.user_id = auth.uid()
    )
  );
