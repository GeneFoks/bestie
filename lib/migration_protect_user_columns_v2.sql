-- ============================================================================
-- Security fix: lock admin / payment columns on public.users
--
-- Found 2026-11-01 on the live DB: the only UPDATE policy on users is
-- "auth.uid() = id" (any column), `authenticated` has UPDATE on is_admin,
-- and protect_user_columns() did not revert is_admin — so any logged-in user
-- could make themselves admin (or Ambassador, or Plus) with the public anon key.
--
-- Now also reverted for API clients: is_admin, is_ambassador, plus_expires_at,
-- stripe_connect_id, connect_charges_enabled. None of these are written by
-- client code: the Stripe routes use the service role, admin_decide_ambassador
-- sets bestie.system.
--
-- New: direct DB sessions (SQL editor, cron, migrations — no PostgREST JWT
-- claims at all) are trusted, so "UPDATE users SET is_admin = true …" from
-- the SQL editor keeps working. Every PostgREST request carries claims
-- (anon / authenticated / service_role), so API clients can't use this path.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- internal system write (scoring / platinum / etc. set this flag)
  IF current_setting('bestie.system', true) = 'on' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_role := current_setting('request.jwt.claims', true)::json ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;

  -- trusted server (service_role key), or a direct DB session with no API claims
  IF v_role = 'service_role' OR v_role IS NULL THEN
    RETURN NEW;
  END IF;

  -- otherwise: revert any attempt to change protected columns
  NEW.bestie_score             := OLD.bestie_score;
  NEW.is_verified              := OLD.is_verified;
  NEW.subscription_tier        := OLD.subscription_tier;
  NEW.hashed_email             := OLD.hashed_email;
  NEW.streak_weeks             := OLD.streak_weeks;
  NEW.sparks_platinum_rewarded := OLD.sparks_platinum_rewarded;
  NEW.is_admin                 := OLD.is_admin;
  NEW.is_ambassador            := OLD.is_ambassador;
  NEW.plus_expires_at          := OLD.plus_expires_at;
  NEW.stripe_connect_id        := OLD.stripe_connect_id;
  NEW.connect_charges_enabled  := OLD.connect_charges_enabled;

  -- referred_by is immutable once set (prevents re-pointing your referrer)
  IF OLD.referred_by IS NOT NULL THEN
    NEW.referred_by := OLD.referred_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
