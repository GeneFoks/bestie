-- ══════════════════════════════════════════════════════════════════
-- Bestie Score v4 — Weighted by counterparty score
-- ══════════════════════════════════════════════════════════════════
--
-- FORMULA:
--   weight(bs) = LEAST(1.5, GREATEST(0.05, bs / 500.0))
--
--   Counterparty BS   Weight    1st-session pts
--   ─────────────────────────────────────────
--   50  (new/fake)    0.10x       10 pts
--   100               0.20x       20 pts
--   250               0.50x       50 pts
--   500               1.00x      100 pts  ← baseline
--   750               1.50x      150 pts
--   800+ (Platinum)   1.50x      150 pts  (capped)
--
-- WHY:
--   Two fake BS-50 accounts → 10+8 = 18 pts from sessions (was 180)
--   One real BS-500 friend  → 100+80 = 180 pts from sessions
--   Gaming becomes 10x less effective.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_score       INTEGER := 0;
  v_user        RECORD;

  -- Sessions
  v_session_idx INTEGER := 0;
  v_session_pts INTEGER[] := ARRAY[100, 80, 60, 40, 20];
  v_session_base INTEGER;
  v_bk          RECORD;

  -- Ratings
  v_rating_idx  INTEGER := 0;
  v_rating_pts  INTEGER;
  v_rt          RECORD;

  -- Sparks
  v_sp          RECORD;

  -- Shared
  v_counterparty_bs INTEGER;
  v_weight          FLOAT;

  -- Streak
  v_streak      INTEGER := 0;
  v_prev_week   TEXT    := NULL;
  v_cont        BOOLEAN := TRUE;
  v_wk_row      RECORD;

  -- Referrals / reports
  v_referrals   INTEGER := 0;
  v_reports     INTEGER := 0;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Profile completeness ──────────────────────────────────────────
  IF v_user.avatar_url  IS NOT NULL AND length(trim(v_user.avatar_url))  > 0 THEN v_score := v_score + 50;  END IF;
  IF v_user.bio         IS NOT NULL AND length(trim(v_user.bio))         > 0 THEN v_score := v_score + 30;  END IF;
  IF v_user.city        IS NOT NULL AND length(trim(v_user.city))        > 0 THEN v_score := v_score + 20;  END IF;
  IF v_user.energy_type IS NOT NULL                                           THEN v_score := v_score + 50;  END IF;
  IF v_user.is_verified = true                                                THEN v_score := v_score + 100; END IF;
  IF EXISTS (SELECT 1 FROM public.activity_packages WHERE user_id = p_user_id LIMIT 1) THEN
    v_score := v_score + 50;
  END IF;

  -- ── Sessions (weighted by counterparty's Bestie Score) ───────────
  FOR v_bk IN
    SELECT
      CASE WHEN b.seeker_id = p_user_id THEN b.provider_id ELSE b.seeker_id END AS counterparty_id
    FROM public.bookings b
    WHERE (b.seeker_id = p_user_id OR b.provider_id = p_user_id)
      AND b.confirmed_by_seeker   = true
      AND b.confirmed_by_provider = true
    ORDER BY COALESCE(b.scheduled_at, b.created_at) ASC
  LOOP
    v_session_idx := v_session_idx + 1;

    -- Counterparty's current BS (default 50 for brand-new accounts)
    SELECT COALESCE(bestie_score, 50) INTO v_counterparty_bs
    FROM public.users WHERE id = v_bk.counterparty_id;

    -- weight: 0.05x at BS≤25, 1.0x at BS=500, capped at 1.5x
    v_weight := LEAST(1.5, GREATEST(0.05, v_counterparty_bs::float / 500.0));

    -- Diminishing returns on session index
    IF v_session_idx <= 5 THEN
      v_session_base := v_session_pts[v_session_idx];
    ELSE
      v_session_base := 1;
    END IF;

    v_score := v_score + ROUND(v_session_base * v_weight);
  END LOOP;

  -- ── Ratings received (weighted by rater's BS + diminishing by count) ──
  FOR v_rt IN
    SELECT r.rating, r.rater_id FROM (
      SELECT b.rating_seeker  AS rating, b.seeker_id   AS rater_id, b.created_at
      FROM public.bookings b WHERE b.provider_id = p_user_id AND b.rating_seeker  IS NOT NULL
      UNION ALL
      SELECT b.rating_provider AS rating, b.provider_id AS rater_id, b.created_at
      FROM public.bookings b WHERE b.seeker_id   = p_user_id AND b.rating_provider IS NOT NULL
    ) r
    ORDER BY r.created_at ASC
  LOOP
    v_rating_idx := v_rating_idx + 1;

    -- Rater's BS
    SELECT COALESCE(bestie_score, 50) INTO v_counterparty_bs
    FROM public.users WHERE id = v_rt.rater_id;

    v_weight := LEAST(1.5, GREATEST(0.05, v_counterparty_bs::float / 500.0));

    -- Base rating points with diminishing returns by count
    IF v_rating_idx <= 3 THEN
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=40; WHEN 4 THEN v_rating_pts:=20;
        WHEN 3 THEN v_rating_pts:=-25; WHEN 2 THEN v_rating_pts:=-60; WHEN 1 THEN v_rating_pts:=-100;
        ELSE v_rating_pts:=0; END CASE;
    ELSIF v_rating_idx <= 10 THEN
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=20; WHEN 4 THEN v_rating_pts:=10;
        WHEN 3 THEN v_rating_pts:=-12; WHEN 2 THEN v_rating_pts:=-30; WHEN 1 THEN v_rating_pts:=-50;
        ELSE v_rating_pts:=0; END CASE;
    ELSE
      CASE v_rt.rating WHEN 5 THEN v_rating_pts:=8; WHEN 4 THEN v_rating_pts:=4;
        WHEN 3 THEN v_rating_pts:=-5; WHEN 2 THEN v_rating_pts:=-12; WHEN 1 THEN v_rating_pts:=-20;
        ELSE v_rating_pts:=0; END CASE;
    END IF;

    v_score := v_score + ROUND(v_rating_pts * v_weight);
  END LOOP;

  -- ── Sparks received (weighted by sender's BS) ─────────────────────
  -- Sparks 1–5: +15 each · Sparks 6–15: +7 each · 16+: +2 each
  DECLARE
    v_spark_idx INTEGER := 0;
    v_spark_base INTEGER;
  BEGIN
    FOR v_sp IN
      SELECT s.sender_id FROM public.sparks s
      WHERE s.receiver_id = p_user_id
      ORDER BY s.created_at ASC
    LOOP
      v_spark_idx := v_spark_idx + 1;

      SELECT COALESCE(bestie_score, 50) INTO v_counterparty_bs
      FROM public.users WHERE id = v_sp.sender_id;

      v_weight := LEAST(1.5, GREATEST(0.05, v_counterparty_bs::float / 500.0));

      IF    v_spark_idx <= 5  THEN v_spark_base := 15;
      ELSIF v_spark_idx <= 15 THEN v_spark_base := 7;
      ELSE                         v_spark_base := 2;
      END IF;

      v_score := v_score + ROUND(v_spark_base * v_weight);
    END LOOP;
  END;

  -- ── Referrals ─────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_referrals FROM public.users WHERE referred_by = p_user_id;
  v_score := v_score + v_referrals;

  -- ── Reports penalty ───────────────────────────────────────────────
  SELECT LEAST(COUNT(*), 5) INTO v_reports
  FROM public.user_reports WHERE reported_id = p_user_id;
  v_score := v_score - (v_reports * 50);

  -- ── Weekly streak bonus (+5 per week, max 12 weeks) ──────────────
  v_streak := 0;
  v_prev_week := NULL;
  v_cont := TRUE;
  FOR v_wk_row IN
    SELECT DISTINCT TO_CHAR(COALESCE(scheduled_at, created_at), 'IYYY-IW') AS wk
    FROM public.bookings
    WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
      AND confirmed_by_seeker   = true
      AND confirmed_by_provider = true
    ORDER BY wk DESC
  LOOP
    IF NOT v_cont THEN EXIT; END IF;
    IF v_prev_week IS NULL THEN
      v_streak    := 1;
      v_prev_week := v_wk_row.wk;
    ELSE
      IF (TO_DATE(v_prev_week, 'IYYY-IW') - TO_DATE(v_wk_row.wk, 'IYYY-IW')) = 7 THEN
        v_streak    := v_streak + 1;
        v_prev_week := v_wk_row.wk;
      ELSE
        v_cont := FALSE;
      END IF;
    END IF;
  END LOOP;
  v_score := v_score + (LEAST(v_streak, 12) * 5);

  -- ── Session memory photo bonus ────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.session_memories
    WHERE user_id = p_user_id AND photo_url IS NOT NULL AND photo_url != ''
    LIMIT 1
  ) THEN
    v_score := v_score + 1;
  END IF;

  -- ── Clamp 50–1000 ─────────────────────────────────────────────────
  v_score := GREATEST(50, LEAST(1000, v_score));

  UPDATE public.users
  SET bestie_score = v_score, streak_weeks = v_streak
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate all existing users with new formula
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(r.id);
  END LOOP;
END;
$$;
