-- BESTIE — Crew entry gate
-- A crew can require a completed profile (Bestie Type test + age + city)
-- before anyone can join or request to join. Built for the AGORA crew:
-- joining AGORA means passing the test and leaving your basic data,
-- with profile sharing to other members opt-in (captains always see it).

-- The live DB was built incrementally and never got users.age (it exists
-- only in the repo's schema.sql); the gate form writes it, so add it here.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS gate_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Application answers (motivation now; more questions later without schema changes)
ALTER TABLE public.crew_join_requests ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE public.crew_join_requests ADD COLUMN IF NOT EXISTS share_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- Carried onto membership when a request is accepted (or set on direct join)
ALTER TABLE public.crew_members ADD COLUMN IF NOT EXISTS share_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- A profile is "complete" when the Bestie Type test is done and the person
-- has age data (age or birth_date) and a city.
CREATE OR REPLACE FUNCTION public.crew_gate_profile_ok(p_user UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(u.bestie_type_completed, FALSE)
     AND (u.age IS NOT NULL OR u.birth_date IS NOT NULL)
     AND NULLIF(TRIM(COALESCE(u.city, '')), '') IS NOT NULL
  FROM public.users u WHERE u.id = p_user;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enforce at the database level on BOTH paths (join requests and direct
-- member inserts), so invite links and RPCs cannot slip past the gate.
-- The captain is exempt (they founded the crew before the gate existed).
CREATE OR REPLACE FUNCTION public.enforce_crew_gate()
RETURNS TRIGGER AS $$
DECLARE g BOOLEAN; cap UUID;
BEGIN
  SELECT gate_enabled, captain_id INTO g, cap FROM public.crews WHERE id = NEW.crew_id;
  IF COALESCE(g, FALSE) AND NEW.user_id IS DISTINCT FROM cap
     AND NOT public.crew_gate_profile_ok(NEW.user_id) THEN
    RAISE EXCEPTION 'crew_gate_profile_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS crew_gate_on_request ON public.crew_join_requests;
CREATE TRIGGER crew_gate_on_request BEFORE INSERT ON public.crew_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crew_gate();

DROP TRIGGER IF EXISTS crew_gate_on_member ON public.crew_members;
CREATE TRIGGER crew_gate_on_member BEFORE INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crew_gate();

-- Turn the gate on for the AGORA crew
UPDATE public.crews SET gate_enabled = TRUE WHERE slug = 'agora';
