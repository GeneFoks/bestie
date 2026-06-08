-- ══════════════════════════════════════════════════════════════════
-- Sparks gate → removed. Sparks can be given freely.
--
-- require_confirmed_session() guards sparks, reviews and lights. It used
-- to require a fully-confirmed booking, which blocked Sparks entirely.
-- Product decision: Sparks are a recommendation you can give to anyone —
-- e.g. vouch for a close friend — so they no longer require a session
-- OR a knock. Abuse is still bounded by the existing limits (max 3
-- Sparks per person + the giver's wallet balance).
--
-- Unchanged: reviews and lights still require a confirmed session,
-- since those are post-meetup endorsements.
--
-- Safe to re-run (CREATE OR REPLACE).
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.require_confirmed_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_giver    UUID;
  v_receiver UUID;
BEGIN
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

  -- Sparks: no session/knock requirement — you can vouch for anyone.
  IF TG_TABLE_NAME = 'sparks' THEN
    RETURN NEW;
  END IF;

  -- reviews / lights still require a real, confirmed session together.
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
$function$;
