-- ══════════════════════════════════════════════════════════════════
-- Sparks gate: people who were at the SAME past group session can Spark
-- each other (host ↔ participant, participant ↔ participant).
--
-- Before this, the gate (lib/migration_sparks_knock_gate.sql) only knew
-- mutual knocks and 1:1 bookings — so the "Spark who came" buttons on an
-- ended group session failed with spark_no_relationship.
--
-- Rules for sparks (giver side) are now:
--   1. bestie_score >= 150 (unchanged), AND
--   2. a real relationship with the receiver:
--        mutual knock  OR  booking accepted/completed
--        OR  both were at the same group session that already happened
--            (not cancelled).
-- Reviews / lights are unchanged. Messaging (can_message) is unchanged.
-- Keep in sync with app/sparks/give/GiveSparkContent.tsx. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.shared_group_session(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_sessions gs
    WHERE gs.scheduled_at < NOW()
      AND gs.status <> 'cancelled'
      AND (gs.host_id = p_a OR EXISTS (
            SELECT 1 FROM public.group_session_participants x
            WHERE x.session_id = gs.id AND x.user_id = p_a))
      AND (gs.host_id = p_b OR EXISTS (
            SELECT 1 FROM public.group_session_participants y
            WHERE y.session_id = gs.id AND y.user_id = p_b))
  );
$$;

GRANT EXECUTE ON FUNCTION public.shared_group_session(UUID, UUID) TO authenticated;

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

    -- (2) mutual knock OR a 1:1 session OR the same past group session
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
    ) AND NOT public.shared_group_session(v_giver, v_receiver) THEN
      RAISE EXCEPTION 'spark_no_relationship'
        USING HINT = 'You can only Spark someone you matched with, had a session with, or met at an event.';
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
