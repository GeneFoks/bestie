-- Fix Bestie Score calculation to match score-guide
-- Ratings stored in bookings.rating_seeker / rating_provider
-- Sessions completed when confirmed_by_seeker AND confirmed_by_provider = true
-- Sparks in sparks.receiver_id

CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_score   INTEGER := 0;
  v_user    RECORD;
  v_i       INTEGER;
  v_session_count INTEGER;
  v_spark_count   INTEGER;
  v_ref_count     INTEGER;
  v_rating  INTEGER;
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

  -- Ratings received (stored in booking fields)
  -- As seeker: other user rated them in rating_provider
  -- As provider: other user rated them in rating_seeker
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

  UPDATE public.users
  SET bestie_score = v_score, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Universal trigger dispatcher
CREATE OR REPLACE FUNCTION public.trigger_recalculate_bestie_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'sparks' THEN
    PERFORM public.recalculate_bestie_score(NEW.receiver_id);

  ELSIF TG_TABLE_NAME = 'bookings' THEN
    -- Fire when a rating is saved or session is confirmed
    PERFORM public.recalculate_bestie_score(NEW.seeker_id);
    PERFORM public.recalculate_bestie_score(NEW.provider_id);

  ELSIF TG_TABLE_NAME = 'activity_packages' THEN
    PERFORM public.recalculate_bestie_score(COALESCE(NEW.user_id, OLD.user_id));

  ELSIF TG_TABLE_NAME = 'users' THEN
    PERFORM public.recalculate_bestie_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers
DROP TRIGGER IF EXISTS on_review_created          ON public.reviews;
DROP TRIGGER IF EXISTS on_review_score_update     ON public.reviews;
DROP TRIGGER IF EXISTS on_spark_score_update      ON public.sparks;
DROP TRIGGER IF EXISTS on_booking_complete_score_update ON public.bookings;
DROP TRIGGER IF EXISTS on_booking_score_update    ON public.bookings;
DROP TRIGGER IF EXISTS on_activity_package_score_update ON public.activity_packages;

-- New triggers
CREATE TRIGGER on_spark_score_update
  AFTER INSERT ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

CREATE TRIGGER on_booking_score_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (
    (NEW.confirmed_by_seeker   IS DISTINCT FROM OLD.confirmed_by_seeker) OR
    (NEW.confirmed_by_provider IS DISTINCT FROM OLD.confirmed_by_provider) OR
    (NEW.rating_seeker         IS DISTINCT FROM OLD.rating_seeker) OR
    (NEW.rating_provider       IS DISTINCT FROM OLD.rating_provider)
  )
  EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

CREATE TRIGGER on_activity_package_score_update
  AFTER INSERT OR DELETE ON public.activity_packages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

-- Recalculate all existing users now
DO $$
DECLARE v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(v_user.id);
  END LOOP;
END $$;
