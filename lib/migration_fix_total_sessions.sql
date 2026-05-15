-- Fix total_sessions column: keep it in sync with actual confirmed bookings
-- Bookings are confirmed when confirmed_by_seeker AND confirmed_by_provider = true

-- 1. Recalculate total_sessions for ALL existing users right now
UPDATE public.users u
SET total_sessions = (
  SELECT COUNT(*)
  FROM public.bookings b
  WHERE (b.seeker_id = u.id OR b.provider_id = u.id)
    AND b.confirmed_by_seeker = true
    AND b.confirmed_by_provider = true
);

-- 2. Update recalculate_bestie_score to also keep total_sessions in sync
CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_score         INTEGER := 0;
  v_user          RECORD;
  v_i             INTEGER;
  v_session_count INTEGER;
  v_spark_count   INTEGER;
  v_ref_count     INTEGER;
  v_rating        INTEGER;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Profile completion (one-time bonuses)
  IF v_user.avatar_url IS NOT NULL AND v_user.avatar_url != '' THEN
    v_score := v_score + 50;
  END IF;
  IF v_user.bio IS NOT NULL AND v_user.bio != '' THEN
    v_score := v_score + 30;
  END IF;
  IF v_user.city IS NOT NULL AND v_user.city != '' THEN
    v_score := v_score + 20;
  END IF;
  IF EXISTS (SELECT 1 FROM public.activity_packages WHERE user_id = p_user_id LIMIT 1) THEN
    v_score := v_score + 50;
  END IF;
  IF v_user.energy_type IS NOT NULL AND v_user.energy_type != '' THEN
    v_score := v_score + 50;
  END IF;
  IF v_user.is_verified = true THEN
    v_score := v_score + 100;
  END IF;

  -- Completed sessions (diminishing returns: 100, 80, 60, 40, 20, then +1)
  SELECT COUNT(*) INTO v_session_count
  FROM public.bookings
  WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
    AND confirmed_by_seeker = true
    AND confirmed_by_provider = true;

  FOR v_i IN 1..v_session_count LOOP
    CASE v_i
      WHEN 1 THEN v_score := v_score + 100;
      WHEN 2 THEN v_score := v_score + 80;
      WHEN 3 THEN v_score := v_score + 60;
      WHEN 4 THEN v_score := v_score + 40;
      WHEN 5 THEN v_score := v_score + 20;
      ELSE       v_score := v_score + 1;
    END CASE;
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

  -- Sparks received (+15 each)
  SELECT COUNT(*) INTO v_spark_count FROM public.sparks WHERE receiver_id = p_user_id;
  v_score := v_score + (v_spark_count * 15);

  -- Referral bonuses (+1 per referred user)
  SELECT COUNT(*) INTO v_ref_count FROM public.users WHERE referred_by = p_user_id;
  v_score := v_score + v_ref_count;

  -- Clamp: minimum 50, maximum 1000
  v_score := GREATEST(50, LEAST(1000, v_score));

  -- Update score AND total_sessions together
  UPDATE public.users
  SET
    bestie_score   = v_score,
    total_sessions = v_session_count
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger to auto-update total_sessions immediately when a booking is confirmed
--    (runs in addition to score recalc, for instant UI accuracy)
CREATE OR REPLACE FUNCTION public.sync_total_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seeker
  UPDATE public.users
  SET total_sessions = (
    SELECT COUNT(*) FROM public.bookings
    WHERE (seeker_id = NEW.seeker_id OR provider_id = NEW.seeker_id)
      AND confirmed_by_seeker = true
      AND confirmed_by_provider = true
  )
  WHERE id = NEW.seeker_id;

  -- Update provider
  UPDATE public.users
  SET total_sessions = (
    SELECT COUNT(*) FROM public.bookings
    WHERE (seeker_id = NEW.provider_id OR provider_id = NEW.provider_id)
      AND confirmed_by_seeker = true
      AND confirmed_by_provider = true
  )
  WHERE id = NEW.provider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_sync_sessions ON public.bookings;

CREATE TRIGGER on_booking_sync_sessions
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (
    (NEW.confirmed_by_seeker   IS DISTINCT FROM OLD.confirmed_by_seeker) OR
    (NEW.confirmed_by_provider IS DISTINCT FROM OLD.confirmed_by_provider)
  )
  EXECUTE FUNCTION public.sync_total_sessions();
