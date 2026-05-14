-- Block table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own blocks" ON public.user_blocks
  FOR ALL USING (auth.uid() = blocker_id);

-- Report table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_id, reported_id)
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users view own reports" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- RPC: block a user
CREATE OR REPLACE FUNCTION public.block_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO public.user_blocks(blocker_id, blocked_id)
  VALUES (p_blocker_id, p_blocked_id)
  ON CONFLICT DO NOTHING;
  RETURN 'blocked';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS TEXT AS $$
BEGIN
  DELETE FROM public.user_blocks WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;
  RETURN 'unblocked';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: report a user (inserts report + recalculates score with penalty)
CREATE OR REPLACE FUNCTION public.report_user(p_reporter_id UUID, p_reported_id UUID, p_reason TEXT)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO public.user_reports(reporter_id, reported_id, reason)
  VALUES (p_reporter_id, p_reported_id, p_reason)
  ON CONFLICT DO NOTHING;

  PERFORM public.recalculate_bestie_score(p_reported_id);
  RETURN 'reported';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update recalculate_bestie_score to factor in reports (-50 per unique reporter, max 5)
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

  -- Clamp 50–1000
  v_score := GREATEST(50, LEAST(1000, v_score));

  UPDATE public.users SET bestie_score = v_score WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
