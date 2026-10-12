-- BESTIE — Crew member levels (1–6) + crew charter
-- The captain sets each member's level; moderators (admins appointed by the
-- captain) can set levels too. What the levels mean is written by the crew
-- itself in its charter — a free-text document on the crew page.

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1
  CHECK (level BETWEEN 1 AND 6);

ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS charter TEXT;

-- Level changes go through this function so moderators can set levels
-- WITHOUT gaining the ability to change roles (the crew_members UPDATE
-- policy stays captain-only).
CREATE OR REPLACE FUNCTION public.set_crew_member_level(p_crew UUID, p_user UUID, p_level INTEGER)
RETURNS void AS $$
DECLARE cap UUID; my_role TEXT;
BEGIN
  IF p_level < 1 OR p_level > 6 THEN
    RAISE EXCEPTION 'level_out_of_range';
  END IF;
  SELECT captain_id INTO cap FROM public.crews WHERE id = p_crew;
  IF cap IS NULL THEN RAISE EXCEPTION 'crew_not_found'; END IF;
  SELECT role INTO my_role FROM public.crew_members
    WHERE crew_id = p_crew AND user_id = auth.uid();
  IF auth.uid() IS DISTINCT FROM cap AND COALESCE(my_role, '') <> 'moderator' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_user = cap THEN
    RAISE EXCEPTION 'cannot_change_captain_level';
  END IF;
  UPDATE public.crew_members SET level = p_level
    WHERE crew_id = p_crew AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
