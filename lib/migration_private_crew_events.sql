-- ============================================================================
-- BESTIE — private crew events stay private
-- Visibility rule (enforced by RLS, so it applies to the events feed, the
-- event page, and any future surface automatically):
--   * PUBLIC sees an event only when the event is NOT members-only AND its
--     crew is public
--   * crew members, the captain, and the creator always see their events
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_see_crew_event(p_crew_id UUID, p_members_only BOOLEAN, p_created_by UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- open event of a public crew → everyone
    (
      NOT COALESCE(p_members_only, FALSE)
      AND EXISTS (
        SELECT 1 FROM public.crews c
        WHERE c.id = p_crew_id AND COALESCE(c.is_public, TRUE) = TRUE
      )
    )
    -- crew member
    OR EXISTS (
      SELECT 1 FROM public.crew_members m
      WHERE m.crew_id = p_crew_id AND m.user_id = auth.uid()
    )
    -- captain
    OR EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = p_crew_id AND c.captain_id = auth.uid()
    )
    -- creator
    OR p_created_by = auth.uid();
$$;

DROP POLICY IF EXISTS "Events visible to all" ON public.crew_events;
DROP POLICY IF EXISTS "Events visible per crew privacy" ON public.crew_events;

CREATE POLICY "Events visible per crew privacy"
  ON public.crew_events FOR SELECT
  USING (public.can_see_crew_event(crew_id, is_members_only, created_by));
