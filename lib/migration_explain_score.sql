-- ══════════════════════════════════════════════════════════════════
-- explain_bestie_score(username) → line-by-line breakdown of a score
--
-- Mirrors recalculate_bestie_score (v4) but, instead of writing a single
-- number, returns one row per scoring component so you can see exactly
-- what a person's Bestie Score is made of and what's missing.
--
-- Usage:
--   SELECT * FROM public.explain_bestie_score('natasha');
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.explain_bestie_score(p_username TEXT)
RETURNS TABLE (component TEXT, points INTEGER, note TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user            RECORD;
  v_uid             UUID;
  v_raw             INTEGER := 0;

  -- sessions
  v_session_idx     INTEGER := 0;
  v_session_total   INTEGER := 0;
  v_session_pts     INTEGER[] := ARRAY[100, 80, 60, 40, 20];
  v_session_base    INTEGER;
  v_bk              RECORD;

  -- ratings
  v_rating_idx      INTEGER := 0;
  v_rating_total    INTEGER := 0;
  v_rating_pts      INTEGER;
  v_rt              RECORD;

  -- sparks
  v_spark_idx       INTEGER := 0;
  v_spark_total     INTEGER := 0;
  v_spark_base      INTEGER;
  v_sp              RECORD;

  v_cp_bs           INTEGER;
  v_weight          FLOAT;

  -- streak
  v_streak          INTEGER := 0;
  v_prev_week       TEXT := NULL;
  v_cont            BOOLEAN := TRUE;
  v_wk              RECORD;

  v_referrals       INTEGER := 0;
  v_reports         INTEGER := 0;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE username = p_username;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'USER NOT FOUND'::TEXT, 0, p_username; RETURN;
  END IF;
  v_uid := v_user.id;

  -- ── Profile completeness ──────────────────────────────────────────
  component := 'Avatar';    points := CASE WHEN v_user.avatar_url IS NOT NULL AND length(trim(v_user.avatar_url)) > 0 THEN 50 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'set' ELSE 'missing — add a photo (+50)' END; v_raw := v_raw + points; RETURN NEXT;
  component := 'Bio';       points := CASE WHEN v_user.bio IS NOT NULL AND length(trim(v_user.bio)) > 0 THEN 30 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'set' ELSE 'missing — add a bio (+30)' END; v_raw := v_raw + points; RETURN NEXT;
  component := 'City';      points := CASE WHEN v_user.city IS NOT NULL AND length(trim(v_user.city)) > 0 THEN 20 ELSE 0 END;
    note := CASE WHEN points > 0 THEN v_user.city ELSE 'missing — add a city (+20)' END; v_raw := v_raw + points; RETURN NEXT;
  component := 'Bestie Type'; points := CASE WHEN v_user.energy_type IS NOT NULL THEN 50 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'completed' ELSE 'missing — take the quiz (+50)' END; v_raw := v_raw + points; RETURN NEXT;
  component := 'Verified';  points := CASE WHEN v_user.is_verified = true THEN 100 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'verified' ELSE 'NOT verified — biggest quick win (+100)' END; v_raw := v_raw + points; RETURN NEXT;
  component := 'Activity package'; points := CASE WHEN EXISTS (SELECT 1 FROM public.activity_packages WHERE user_id = v_uid LIMIT 1) THEN 50 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'has activities' ELSE 'missing — add an activity (+50)' END; v_raw := v_raw + points; RETURN NEXT;

  -- ── Sessions (weighted by counterparty BS) ────────────────────────
  FOR v_bk IN
    SELECT CASE WHEN b.seeker_id = v_uid THEN b.provider_id ELSE b.seeker_id END AS cp
    FROM public.bookings b
    WHERE (b.seeker_id = v_uid OR b.provider_id = v_uid)
      AND b.confirmed_by_seeker = true AND b.confirmed_by_provider = true
    ORDER BY COALESCE(b.scheduled_at, b.created_at) ASC
  LOOP
    v_session_idx := v_session_idx + 1;
    SELECT COALESCE(bestie_score, 50) INTO v_cp_bs FROM public.users WHERE id = v_bk.cp;
    v_weight := LEAST(1.5, GREATEST(0.05, v_cp_bs::float / 500.0));
    v_session_base := CASE WHEN v_session_idx <= 5 THEN v_session_pts[v_session_idx] ELSE 1 END;
    v_session_total := v_session_total + ROUND(v_session_base * v_weight);
  END LOOP;
  component := 'Sessions'; points := v_session_total;
    note := v_session_idx || ' confirmed session(s)'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Ratings received ──────────────────────────────────────────────
  FOR v_rt IN
    SELECT r.rating, r.rater_id FROM (
      SELECT b.rating_seeker AS rating, b.seeker_id AS rater_id, b.created_at
      FROM public.bookings b WHERE b.provider_id = v_uid AND b.rating_seeker IS NOT NULL
      UNION ALL
      SELECT b.rating_provider AS rating, b.provider_id AS rater_id, b.created_at
      FROM public.bookings b WHERE b.seeker_id = v_uid AND b.rating_provider IS NOT NULL
    ) r ORDER BY r.created_at ASC
  LOOP
    v_rating_idx := v_rating_idx + 1;
    SELECT COALESCE(bestie_score, 50) INTO v_cp_bs FROM public.users WHERE id = v_rt.rater_id;
    v_weight := LEAST(1.5, GREATEST(0.05, v_cp_bs::float / 500.0));
    IF v_rating_idx <= 3 THEN
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=40; WHEN 4 THEN v_rating_pts:=20; WHEN 3 THEN v_rating_pts:=-25; WHEN 2 THEN v_rating_pts:=-60; WHEN 1 THEN v_rating_pts:=-100; ELSE v_rating_pts:=0; END CASE;
    ELSIF v_rating_idx <= 10 THEN
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=20; WHEN 4 THEN v_rating_pts:=10; WHEN 3 THEN v_rating_pts:=-12; WHEN 2 THEN v_rating_pts:=-30; WHEN 1 THEN v_rating_pts:=-50; ELSE v_rating_pts:=0; END CASE;
    ELSE
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=8; WHEN 4 THEN v_rating_pts:=4; WHEN 3 THEN v_rating_pts:=-5; WHEN 2 THEN v_rating_pts:=-12; WHEN 1 THEN v_rating_pts:=-20; ELSE v_rating_pts:=0; END CASE;
    END IF;
    v_rating_total := v_rating_total + ROUND(v_rating_pts * v_weight);
  END LOOP;
  component := 'Ratings'; points := v_rating_total;
    note := v_rating_idx || ' rating(s) received'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Sparks received (weighted by giver BS) ────────────────────────
  FOR v_sp IN
    SELECT s.giver_id FROM public.sparks s WHERE s.receiver_id = v_uid ORDER BY s.created_at ASC
  LOOP
    v_spark_idx := v_spark_idx + 1;
    SELECT COALESCE(bestie_score, 50) INTO v_cp_bs FROM public.users WHERE id = v_sp.giver_id;
    v_weight := LEAST(1.5, GREATEST(0.05, v_cp_bs::float / 500.0));
    v_spark_base := CASE WHEN v_spark_idx <= 5 THEN 15 WHEN v_spark_idx <= 15 THEN 7 ELSE 2 END;
    v_spark_total := v_spark_total + ROUND(v_spark_base * v_weight);
  END LOOP;
  component := 'Sparks received'; points := v_spark_total;
    note := v_spark_idx || ' spark(s) — weighted by each giver''s score'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Referrals ─────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_referrals FROM public.users WHERE referred_by = v_uid;
  component := 'Referrals'; points := v_referrals; note := v_referrals || ' person(s) referred (+1 each)'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Reports penalty ───────────────────────────────────────────────
  SELECT LEAST(COUNT(*), 5) INTO v_reports FROM public.user_reports WHERE reported_id = v_uid;
  component := 'Reports'; points := -(v_reports * 50); note := v_reports || ' report(s) (-50 each)'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Weekly streak ─────────────────────────────────────────────────
  FOR v_wk IN
    SELECT DISTINCT TO_CHAR(COALESCE(scheduled_at, created_at), 'IYYY-IW') AS wk
    FROM public.bookings
    WHERE (seeker_id = v_uid OR provider_id = v_uid)
      AND confirmed_by_seeker = true AND confirmed_by_provider = true
    ORDER BY wk DESC
  LOOP
    IF NOT v_cont THEN EXIT; END IF;
    IF v_prev_week IS NULL THEN v_streak := 1; v_prev_week := v_wk.wk;
    ELSE
      IF (TO_DATE(v_prev_week, 'IYYY-IW') - TO_DATE(v_wk.wk, 'IYYY-IW')) = 7 THEN
        v_streak := v_streak + 1; v_prev_week := v_wk.wk;
      ELSE v_cont := FALSE; END IF;
    END IF;
  END LOOP;
  component := 'Weekly streak'; points := LEAST(v_streak, 12) * 5; note := v_streak || ' week streak (+5/week, max 12)'; v_raw := v_raw + points; RETURN NEXT;

  -- ── Session memory photo ──────────────────────────────────────────
  component := 'Session photo';
    points := CASE WHEN EXISTS (SELECT 1 FROM public.session_memories WHERE user_id = v_uid AND photo_url IS NOT NULL AND photo_url != '' LIMIT 1) THEN 1 ELSE 0 END;
    note := CASE WHEN points > 0 THEN 'has one' ELSE 'none' END; v_raw := v_raw + points; RETURN NEXT;

  -- ── Totals ────────────────────────────────────────────────────────
  component := '── RAW TOTAL ──'; points := v_raw; note := 'sum of everything above'; RETURN NEXT;
  component := '── FINAL (clamped 50–1000) ──'; points := GREATEST(50, LEAST(1000, v_raw)); note := 'this is the Bestie Score'; RETURN NEXT;
  component := 'Stored in DB now'; points := COALESCE(v_user.bestie_score, 0); note := 'should match FINAL after a recalc'; RETURN NEXT;
END;
$$;
