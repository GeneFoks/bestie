-- Fix Bestie Score calculation to match score-guide
-- Profile: avatar(50) + bio(30) + city(20) + activity(50) + bestie_type(50) + verified(100)
-- Per session: completed(+100), 5-star(+40), 4-star(+20), 3-star(-25), 2-star(-60), 1-star(-100)
-- Per spark received: +15
-- Inactivity/reports: handled separately (not in this recalc)

CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_score INTEGER := 0;
  v_user RECORD;
  v_spark_count INTEGER;
  v_session_count INTEGER;
  v_ref_count INTEGER;
  v_r RECORD;
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
    v_score := v_score + 50; -- Bestie Type quiz done
  END IF;
  IF v_user.is_verified = true THEN
    v_score := v_score + 100;
  END IF;

  -- Completed sessions (+100 each)
  SELECT COUNT(*) INTO v_session_count
  FROM public.bookings
  WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
    AND status = 'completed';
  v_score := v_score + (v_session_count * 100);

  -- Ratings received
  FOR v_r IN SELECT star_rating FROM public.reviews WHERE reviewee_id = p_user_id LOOP
    CASE v_r.star_rating
      WHEN 5 THEN v_score := v_score + 40;
      WHEN 4 THEN v_score := v_score + 20;
      WHEN 3 THEN v_score := v_score - 25;
      WHEN 2 THEN v_score := v_score - 60;
      WHEN 1 THEN v_score := v_score - 100;
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
  IF TG_TABLE_NAME = 'reviews' THEN
    PERFORM public.recalculate_bestie_score(NEW.reviewee_id);
  ELSIF TG_TABLE_NAME = 'sparks' THEN
    PERFORM public.recalculate_bestie_score(NEW.receiver_id);
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    IF NEW.status = 'completed' THEN
      PERFORM public.recalculate_bestie_score(NEW.seeker_id);
      PERFORM public.recalculate_bestie_score(NEW.provider_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'activity_packages' THEN
    PERFORM public.recalculate_bestie_score(COALESCE(NEW.user_id, OLD.user_id));
  ELSIF TG_TABLE_NAME = 'users' THEN
    PERFORM public.recalculate_bestie_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and replace
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
DROP TRIGGER IF EXISTS on_review_score_update ON public.reviews;
DROP TRIGGER IF EXISTS on_spark_score_update ON public.sparks;
DROP TRIGGER IF EXISTS on_booking_complete_score_update ON public.bookings;
DROP TRIGGER IF EXISTS on_activity_package_score_update ON public.activity_packages;

CREATE TRIGGER on_review_score_update
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

CREATE TRIGGER on_spark_score_update
  AFTER INSERT ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

CREATE TRIGGER on_booking_complete_score_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

CREATE TRIGGER on_activity_package_score_update
  AFTER INSERT OR DELETE ON public.activity_packages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_bestie_score();

-- Recalculate all users (run once to fix existing scores)
DO $$
DECLARE v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(v_user.id);
  END LOOP;
END $$;
