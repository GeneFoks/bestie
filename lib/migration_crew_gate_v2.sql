-- BESTIE — Crew gate v2: the gate moves from JOINING to LEVELS.
-- Decision 2026-10-12: anyone may join or request to join (people who are
-- simply interested are welcome and may not want to share data). A completed
-- profile (Bestie Type test + age/birth date + city) is required only to be
-- RAISED to level 2+ in a gated crew. Level 1 is open to everyone.

-- 1. Joining is free again — remove the entry triggers.
DROP TRIGGER IF EXISTS crew_gate_on_request ON public.crew_join_requests;
DROP TRIGGER IF EXISTS crew_gate_on_member ON public.crew_members;

-- 2. Levels 2+ in a gated crew require the completed profile.
CREATE OR REPLACE FUNCTION public.set_crew_member_level(p_crew UUID, p_user UUID, p_level INTEGER)
RETURNS void AS $$
DECLARE cap UUID; gated BOOLEAN; my_role TEXT;
BEGIN
  IF p_level < 1 OR p_level > 6 THEN
    RAISE EXCEPTION 'level_out_of_range';
  END IF;
  SELECT captain_id, gate_enabled INTO cap, gated FROM public.crews WHERE id = p_crew;
  IF cap IS NULL THEN RAISE EXCEPTION 'crew_not_found'; END IF;
  SELECT role INTO my_role FROM public.crew_members
    WHERE crew_id = p_crew AND user_id = auth.uid();
  IF auth.uid() IS DISTINCT FROM cap AND COALESCE(my_role, '') <> 'moderator' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_user = cap THEN
    RAISE EXCEPTION 'cannot_change_captain_level';
  END IF;
  IF p_level >= 2 AND COALESCE(gated, FALSE)
     AND NOT public.crew_gate_profile_ok(p_user) THEN
    RAISE EXCEPTION 'level_requires_profile';
  END IF;
  UPDATE public.crew_members SET level = p_level
    WHERE crew_id = p_crew AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Repair: any 'accepted' requests whose member insert was blocked by the
-- old entry gate go back to pending (so the captain can accept them again).
UPDATE public.crew_join_requests r
SET status = 'pending'
FROM public.crews c
WHERE c.id = r.crew_id
  AND r.status = 'accepted'
  AND NOT EXISTS (SELECT 1 FROM public.crew_members m
                  WHERE m.crew_id = r.crew_id AND m.user_id = r.user_id);
