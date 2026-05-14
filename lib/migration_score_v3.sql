-- Bestie Score v3
-- Changes vs v2 (streak):
--   1. Ratings received: diminishing returns by count tier
--   2. Sparks received: diminishing returns by count tier
--   3. +1 for at least 1 session memory with a photo

CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_score       INTEGER := 0;
  v_user        RECORD;
  v_sessions    INTEGER := 0;
  v_i           INTEGER;
  v_session_pts INTEGER[] := ARRAY[100, 80, 60, 40, 20];
  v_rating      INTEGER;
  v_rating_idx  INTEGER := 0;
  v_rating_pts  INTEGER;
  v_sparks      INTEGER := 0;
  v_spark_pts   INTEGER := 0;
  v_referrals   INTEGER := 0;
  v_reports     INTEGER := 0;
  v_streak      INTEGER := 0;
  v_prev_week   TEXT := NULL;
  v_wk_row      RECORD;
  v_cont        BOOLEAN := TRUE;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Profile completeness ──────────────────────────────────────────────────
  IF v_user.avatar_url IS NOT NULL THEN v_score := v_score + 50; END IF;
  IF v_user.bio IS NOT NULL AND length(trim(v_user.bio)) > 0 THEN v_score := v_score + 30; END IF;
  IF v_user.city IS NOT NULL AND length(trim(v_user.city)) > 0 THEN v_score := v_score + 20; END IF;
  IF v_user.energy_type IS NOT NULL THEN v_score := v_score + 50; END IF;
  IF v_user.is_verified THEN v_score := v_score + 100; END IF;
  IF EXISTS (SELECT 1 FROM public.activity_packages WHERE user_id = p_user_id LIMIT 1) THEN
    v_score := v_score + 50;
  END IF;

  -- ── Sessions (diminishing returns: 100, 80, 60, 40, 20, then +1) ─────────
  SELECT COUNT(*) INTO v_sessions
  FROM public.bookings
  WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
    AND confirmed_by_seeker = true
    AND confirmed_by_provider = true;

  FOR v_i IN 1..v_sessions LOOP
    IF v_i <= 5 THEN
      v_score := v_score + v_session_pts[v_i];
    ELSE
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- ── Ratings received (diminishing returns by count) ───────────────────────
  -- Tier 1 (ratings 1–3):  5★=40  4★=20  3★=-25  2★=-60  1★=-100
  -- Tier 2 (ratings 4–10): 5★=20  4★=10  3★=-12  2★=-30  1★=-50
  -- Tier 3 (11+):          5★=8   4★=4   3★=-5   2★=-12  1★=-20
  v_rating_idx := 0;
  FOR v_rating IN
    SELECT rating_seeker FROM public.bookings
    WHERE provider_id = p_user_id AND rating_seeker IS NOT NULL
    UNION ALL
    SELECT rating_provider FROM public.bookings
    WHERE seeker_id = p_user_id AND rating_provider IS NOT NULL
  LOOP
    v_rating_idx := v_rating_idx + 1;

    IF v_rating_idx <= 3 THEN
      -- Full weight
      CASE v_rating
        WHEN 5 THEN v_rating_pts :=   40;
        WHEN 4 THEN v_rating_pts :=   20;
        WHEN 3 THEN v_rating_pts :=  -25;
        WHEN 2 THEN v_rating_pts :=  -60;
        WHEN 1 THEN v_rating_pts := -100;
        ELSE         v_rating_pts :=    0;
      END CASE;
    ELSIF v_rating_idx <= 10 THEN
      -- Half weight
      CASE v_rating
        WHEN 5 THEN v_rating_pts :=  20;
        WHEN 4 THEN v_rating_pts :=  10;
        WHEN 3 THEN v_rating_pts := -12;
        WHEN 2 THEN v_rating_pts := -30;
        WHEN 1 THEN v_rating_pts := -50;
        ELSE         v_rating_pts :=   0;
      END CASE;
    ELSE
      -- Quarter weight
      CASE v_rating
        WHEN 5 THEN v_rating_pts :=  8;
        WHEN 4 THEN v_rating_pts :=  4;
        WHEN 3 THEN v_rating_pts := -5;
        WHEN 2 THEN v_rating_pts := -12;
        WHEN 1 THEN v_rating_pts := -20;
        ELSE         v_rating_pts :=  0;
      END CASE;
    END IF;

    v_score := v_score + v_rating_pts;
  END LOOP;

  -- ── Sparks received (diminishing returns by count) ────────────────────────
  -- Sparks 1–5:   +15 each  (max 75)
  -- Sparks 6–15:  +7  each  (max 70)
  -- Sparks 16+:   +2  each
  SELECT COUNT(*) INTO v_sparks FROM public.sparks WHERE receiver_id = p_user_id;
  IF v_sparks <= 5 THEN
    v_spark_pts := v_sparks * 15;
  ELSIF v_sparks <= 15 THEN
    v_spark_pts := 5 * 15 + (v_sparks - 5) * 7;
  ELSE
    v_spark_pts := 5 * 15 + 10 * 7 + (v_sparks - 15) * 2;
  END IF;
  v_score := v_score + v_spark_pts;

  -- ── Referrals ─────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_referrals FROM public.users WHERE referred_by = p_user_id;
  v_score := v_score + v_referrals;

  -- ── Reports penalty ───────────────────────────────────────────────────────
  SELECT LEAST(COUNT(*), 5) INTO v_reports
  FROM public.user_reports WHERE reported_id = p_user_id;
  v_score := v_score - (v_reports * 50);

  -- ── Streak bonus (+5 per week, max 12 weeks) ──────────────────────────────
  v_streak := 0;
  v_prev_week := NULL;
  v_cont := TRUE;
  FOR v_wk_row IN
    SELECT DISTINCT TO_CHAR(COALESCE(scheduled_at, created_at), 'IYYY-IW') AS wk
    FROM public.bookings
    WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
      AND confirmed_by_seeker = true
      AND confirmed_by_provider = true
    ORDER BY wk DESC
  LOOP
    IF NOT v_cont THEN EXIT; END IF;
    IF v_prev_week IS NULL THEN
      v_streak := 1;
      v_prev_week := v_wk_row.wk;
    ELSE
      IF (TO_DATE(v_prev_week, 'IYYY-IW') - TO_DATE(v_wk_row.wk, 'IYYY-IW')) = 7 THEN
        v_streak := v_streak + 1;
        v_prev_week := v_wk_row.wk;
      ELSE
        v_cont := FALSE;
      END IF;
    END IF;
  END LOOP;
  v_score := v_score + (LEAST(v_streak, 12) * 5);

  -- ── Session memory photo bonus (+1 for at least 1 photo) ─────────────────
  IF EXISTS (
    SELECT 1 FROM public.session_memories
    WHERE user_id = p_user_id AND photo_url IS NOT NULL AND photo_url != ''
    LIMIT 1
  ) THEN
    v_score := v_score + 1;
  END IF;

  -- ── Clamp 50–1000 ─────────────────────────────────────────────────────────
  v_score := GREATEST(50, LEAST(1000, v_score));

  UPDATE public.users
  SET bestie_score = v_score, streak_weeks = v_streak
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: recalculate when a memory with photo is saved
CREATE OR REPLACE FUNCTION public.trigger_recalculate_on_memory()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_bestie_score(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_memory_score_update ON public.session_memories;
CREATE TRIGGER on_memory_score_update
  AFTER INSERT OR UPDATE OF photo_url ON public.session_memories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_on_memory();

-- Recalculate all existing users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(r.id);
  END LOOP;
END;
$$;
