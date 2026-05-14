-- Streak: consecutive weeks with at least 1 confirmed session
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_weeks INTEGER DEFAULT 0;

-- Updated recalculate_bestie_score with streak bonus
CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_score       INTEGER := 0;
  v_user        RECORD;
  v_sessions    INTEGER := 0;
  v_i           INTEGER;
  v_session_pts INTEGER[] := ARRAY[100, 80, 60, 40, 20];
  v_rating      INTEGER;
  v_sparks      INTEGER := 0;
  v_referrals   INTEGER := 0;
  v_reports     INTEGER := 0;
  v_streak      INTEGER := 0;
  v_prev_week   TEXT := NULL;
  v_wk_row      RECORD;
  v_cont        BOOLEAN := TRUE;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Profile completeness
  IF v_user.avatar_url IS NOT NULL THEN v_score := v_score + 50; END IF;
  IF v_user.bio IS NOT NULL AND length(trim(v_user.bio)) > 0 THEN v_score := v_score + 30; END IF;
  IF v_user.city IS NOT NULL AND length(trim(v_user.city)) > 0 THEN v_score := v_score + 20; END IF;
  IF v_user.energy_type IS NOT NULL THEN v_score := v_score + 50; END IF;
  IF v_user.is_verified THEN v_score := v_score + 100; END IF;

  -- Has activity packages
  IF EXISTS (SELECT 1 FROM public.activity_packages WHERE user_id = p_user_id LIMIT 1) THEN
    v_score := v_score + 50;
  END IF;

  -- Sessions (diminishing returns)
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

  -- Ratings received
  FOR v_rating IN
    SELECT rating_seeker FROM public.bookings
    WHERE provider_id = p_user_id AND rating_seeker IS NOT NULL
    UNION ALL
    SELECT rating_provider FROM public.bookings
    WHERE seeker_id = p_user_id AND rating_provider IS NOT NULL
  LOOP
    CASE v_rating
      WHEN 5 THEN v_score := v_score + 40;
      WHEN 4 THEN v_score := v_score + 20;
      WHEN 3 THEN v_score := v_score - 25;
      WHEN 2 THEN v_score := v_score - 60;
      WHEN 1 THEN v_score := v_score - 100;
      ELSE NULL;
    END CASE;
  END LOOP;

  -- Sparks received
  SELECT COUNT(*) INTO v_sparks FROM public.sparks WHERE receiver_id = p_user_id;
  v_score := v_score + (v_sparks * 15);

  -- Referrals
  SELECT COUNT(*) INTO v_referrals FROM public.users WHERE referred_by = p_user_id;
  v_score := v_score + v_referrals;

  -- Reports penalty (-50 each, max 5 unique reporters)
  SELECT LEAST(COUNT(*), 5) INTO v_reports
  FROM public.user_reports WHERE reported_id = p_user_id;
  v_score := v_score - (v_reports * 50);

  -- Streak: consecutive weeks with >= 1 confirmed session (newest first)
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

  -- Streak bonus: +5 per week, max 12 weeks = +60
  v_score := v_score + (LEAST(v_streak, 12) * 5);

  -- Clamp 50–1000
  v_score := GREATEST(50, LEAST(1000, v_score));

  UPDATE public.users SET bestie_score = v_score, streak_weeks = v_streak WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate streak for all existing users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(r.id);
  END LOOP;
END;
$$;
