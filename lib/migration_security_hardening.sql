-- ============================================================================
-- Security hardening
--   #1  Lock protected columns on public.users so a user cannot self-edit
--       bestie_score / verification / subscription / trust counters via the
--       public anon key.
--   #2  Require a confirmed booking between two people before a spark / review /
--       light can be inserted (stops score manipulation & griefing).
--
-- Design note for #1:
--   Legitimate writes to protected columns come from:
--     (a) the scoring function & other SECURITY DEFINER triggers, which set the
--         transaction-local flag  bestie.system = 'on'  before writing, and
--     (b) trusted server code using the service_role key.
--   Everything else (authenticated / anon PostgREST clients) is silently
--   reverted to the previous values.
-- ============================================================================

-- ── #1 — protect sensitive columns ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- internal system write (scoring / platinum / etc. set this flag)
  IF current_setting('bestie.system', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- trusted server (service_role key) is allowed through
  BEGIN
    v_role := current_setting('request.jwt.claims', true)::json ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- otherwise: revert any attempt to change protected columns
  NEW.bestie_score             := OLD.bestie_score;
  NEW.is_verified              := OLD.is_verified;
  NEW.subscription_tier        := OLD.subscription_tier;
  NEW.hashed_email             := OLD.hashed_email;
  NEW.streak_weeks             := OLD.streak_weeks;
  NEW.sparks_platinum_rewarded := OLD.sparks_platinum_rewarded;

  -- referred_by is immutable once set (prevents re-pointing your referrer)
  IF OLD.referred_by IS NOT NULL THEN
    NEW.referred_by := OLD.referred_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_user_columns_trg ON public.users;
CREATE TRIGGER protect_user_columns_trg
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_columns();


-- ── #2 — sparks require a confirmed shared booking ──────────────────────────
CREATE OR REPLACE FUNCTION public.require_confirmed_session()
RETURNS TRIGGER AS $$
DECLARE
  v_giver    UUID;
  v_receiver UUID;
BEGIN
  -- generic: works for sparks (giver_id/receiver_id), reviews (reviewer/reviewee),
  -- lights (from_user/to_user). We resolve the pair per-table.
  IF TG_TABLE_NAME = 'sparks' THEN
    v_giver := NEW.giver_id; v_receiver := NEW.receiver_id;
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    v_giver := NEW.reviewer_id; v_receiver := NEW.reviewee_id;
  ELSIF TG_TABLE_NAME = 'lights' THEN
    v_giver := NEW.from_user_id; v_receiver := NEW.to_user_id;
  END IF;

  IF v_giver IS NULL OR v_receiver IS NULL OR v_giver = v_receiver THEN
    RAISE EXCEPTION 'Invalid endorsement pair';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.confirmed_by_seeker = TRUE
      AND b.confirmed_by_provider = TRUE
      AND ( (b.seeker_id = v_giver AND b.provider_id = v_receiver)
         OR (b.seeker_id = v_receiver AND b.provider_id = v_giver) )
  ) THEN
    RAISE EXCEPTION 'You can only endorse people you have had a confirmed session with';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS require_session_sparks ON public.sparks;
CREATE TRIGGER require_session_sparks
  BEFORE INSERT ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.require_confirmed_session();

-- Apply to legacy tables too, only if they still exist
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS require_session_reviews ON public.reviews;
    CREATE TRIGGER require_session_reviews
      BEFORE INSERT ON public.reviews
      FOR EACH ROW EXECUTE FUNCTION public.require_confirmed_session();
  END IF;
  IF to_regclass('public.lights') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS require_session_lights ON public.lights;
    CREATE TRIGGER require_session_lights
      BEFORE INSERT ON public.lights
      FOR EACH ROW EXECUTE FUNCTION public.require_confirmed_session();
  END IF;
END;
$$;
