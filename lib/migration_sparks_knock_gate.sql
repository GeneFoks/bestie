-- ══════════════════════════════════════════════════════════════════
-- Sparks gate → require a minimum Bestie Score from the GIVER
--
-- require_confirmed_session() guards sparks, reviews and lights.
--
-- New rule:
--   • sparks           → the giver must have bestie_score >= 150
--                        (≈ a fully filled-out profile). No session or
--                        knock needed — you can vouch for anyone — but
--                        empty / fake accounts can't hand out Sparks.
--   • reviews / lights → confirmed session only (unchanged).
--
-- Keep this in sync with MIN_SPARK_SCORE in
-- app/sparks/give/GiveSparkContent.tsx. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.require_confirmed_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_giver    UUID;
  v_receiver UUID;
  v_giver_bs INTEGER;
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

  -- Sparks: require a minimum Bestie Score from the giver.
  IF TG_TABLE_NAME = 'sparks' THEN
    SELECT COALESCE(bestie_score, 0) INTO v_giver_bs
      FROM public.users WHERE id = v_giver;
    IF v_giver_bs < 150 THEN
      RAISE EXCEPTION 'spark_score_too_low'
        USING HINT = 'Reach a Bestie Score of 150 (complete your profile) to give Sparks.';
    END IF;
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
