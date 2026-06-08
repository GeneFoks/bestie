-- ══════════════════════════════════════════════════════════════════
-- Sparks gate → allow after a MUTUAL KNOCK or a confirmed session
--
-- require_confirmed_session() guards sparks, reviews and lights. It used
-- to require a fully-confirmed booking for ALL of them — so Sparks were
-- blocked even between two people who mutually knocked (matched), which
-- surfaced in the app as a generic "Something went wrong."
--
-- New rule:
--   • sparks           → mutual knock (either direction) OR confirmed session
--   • reviews / lights → confirmed session only (unchanged — these are
--                        post-meetup endorsements)
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
  v_has_session BOOLEAN;
  v_has_match   BOOLEAN;
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

  -- A confirmed session together (both sides confirmed the booking).
  v_has_session := EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.confirmed_by_seeker = TRUE
      AND b.confirmed_by_provider = TRUE
      AND ( (b.seeker_id = v_giver AND b.provider_id = v_receiver)
         OR (b.seeker_id = v_receiver AND b.provider_id = v_giver) )
  );

  -- Sparks are also unlocked by a mutual knock (a match).
  IF TG_TABLE_NAME = 'sparks' THEN
    v_has_match := EXISTS (
      SELECT 1 FROM public.knocks k
      WHERE k.is_mutual = TRUE
        AND ( (k.sender_id = v_giver AND k.receiver_id = v_receiver)
           OR (k.sender_id = v_receiver AND k.receiver_id = v_giver) )
    );
    IF NOT (v_has_session OR v_has_match) THEN
      RAISE EXCEPTION 'You can give Sparks only after you match (mutual knock) or have a confirmed session';
    END IF;
  ELSE
    -- reviews / lights still require a real, confirmed session.
    IF NOT v_has_session THEN
      RAISE EXCEPTION 'You can only endorse people you have had a confirmed session with';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
