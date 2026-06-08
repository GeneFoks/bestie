-- ══════════════════════════════════════════════════════════════════
-- Crew creation limit → free members can lead only ONE crew
--
-- Mirrors the UI rule in app/crews/new/page.tsx, but enforced in the DB
-- so it can't be bypassed by calling the API directly:
--
--   • Free member            → at most 1 captained crew.
--   • Bestie Plus member      → score-based slots, always at least 2,
--                               scaling to 5 (BS 600 → 3, 800 → 4, 1000 → 5).
--
-- "Plus" counts only while the subscription is active (subscription_tier
-- = 'plus' AND plus_expires_at in the future / null). Runs BEFORE INSERT.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_crew_create_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score      INTEGER;
  v_tier       TEXT;
  v_expires    TIMESTAMPTZ;
  v_is_plus    BOOLEAN;
  v_score_slot INTEGER;
  v_cap        INTEGER;
  v_owned      INTEGER;
BEGIN
  SELECT COALESCE(bestie_score, 0), subscription_tier, plus_expires_at
    INTO v_score, v_tier, v_expires
    FROM public.users
    WHERE id = NEW.captain_id;

  v_is_plus := (v_tier = 'plus' AND (v_expires IS NULL OR v_expires > NOW()));

  -- Score-based slot count (same thresholds as the UI)
  v_score_slot := CASE
    WHEN v_score >= 1000 THEN 5
    WHEN v_score >= 800  THEN 4
    WHEN v_score >= 600  THEN 3
    WHEN v_score >= 400  THEN 2
    ELSE 1
  END;

  IF v_is_plus THEN
    v_cap := GREATEST(2, v_score_slot);
  ELSE
    v_cap := 1;
  END IF;

  SELECT COUNT(*) INTO v_owned
    FROM public.crews
    WHERE captain_id = NEW.captain_id;

  IF v_owned >= v_cap THEN
    IF v_is_plus THEN
      RAISE EXCEPTION 'crew_limit_reached'
        USING HINT = 'Raise your Bestie Score to unlock more crew slots.';
    ELSE
      RAISE EXCEPTION 'crew_limit_free'
        USING HINT = 'Upgrade to Bestie Plus to lead more than one crew.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_crew_create_limit ON public.crews;
CREATE TRIGGER trg_enforce_crew_create_limit
  BEFORE INSERT ON public.crews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crew_create_limit();
