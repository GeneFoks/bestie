-- ══════════════════════════════════════════════════════════════════
-- Sparks gate → require Bestie Score + a real relationship (GIVER side)
--
-- require_confirmed_session() guards sparks, reviews and lights.
--
-- Rules:
--   • sparks           → BOTH must hold for the giver:
--                          1. bestie_score >= 150 (≈ a fully filled-out
--                             profile) so empty/fake accounts can't Spark, AND
--                          2. a real relationship with the receiver:
--                             a mutual knock (match) OR a shared session
--                             (booking status accepted/completed).
--   • reviews / lights → confirmed session only (unchanged).
--
-- The relationship rule mirrors the messaging gate (can_message) so the
-- two stay consistent: you can Spark exactly the people you can DM.
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

  -- Sparks: (1) minimum Bestie Score AND (2) a real relationship.
  IF TG_TABLE_NAME = 'sparks' THEN
    -- (1) established profile
    SELECT COALESCE(bestie_score, 0) INTO v_giver_bs
      FROM public.users WHERE id = v_giver;
    IF v_giver_bs < 150 THEN
      RAISE EXCEPTION 'spark_score_too_low'
        USING HINT = 'Reach a Bestie Score of 150 (complete your profile) to give Sparks.';
    END IF;

    -- (2) mutual knock (match) OR a real session together
    IF NOT EXISTS (
      SELECT 1 FROM public.knocks k
      WHERE k.is_mutual = true
        AND ( (k.sender_id = v_giver    AND k.receiver_id = v_receiver)
           OR (k.sender_id = v_receiver AND k.receiver_id = v_giver) )
    ) AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status IN ('accepted', 'completed')
        AND ( (b.seeker_id = v_giver    AND b.provider_id = v_receiver)
           OR (b.seeker_id = v_receiver AND b.provider_id = v_giver) )
    ) THEN
      RAISE EXCEPTION 'spark_no_relationship'
        USING HINT = 'You can only Spark someone you matched with (mutual knock) or had a session with.';
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
