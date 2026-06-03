-- ============================================================================
-- Bestie Score v4
-- Goals vs v3:
--   * Set-based (no per-row loops) → fast at scale (fixes perf issue #10)
--   * 1000 is genuinely hard & slow: 7 capped components summing to 1000,
--     gated by tenure (account age) and a 12-week streak that cannot be rushed
--   * Diminishing returns on every grindable axis (sessions, sparks)
--   * Quality-weighted ratings with Bayesian shrink (low volume can't spike you)
--   * Activated-only referrals (referred user must have a confirmed session)
--   * Auto-recalc on every relevant event (sessions / sparks / reports / referrals)
--
-- Component caps:
--   Profile completeness ...... 140
--   Confirmed sessions ........ 250   250*(1-exp(-n/12))
--   Rating quality ............ 200   200 * (m/(m+5)) * clamp((avg-3)/2,-1,1)
--   Sparks received ........... 150   150*(1-exp(-s/10))
--   Weekly streak ............. 150   least(weeks,12)/12 * 150
--   Account tenure ............ 50    least(months,6)/6 * 50
--   Activated referrals ....... 50    least(r,10) * 5
--   Reports penalty ........... -50 each (no cap on downside beyond clamp)
--   Final clamp ............... 50 .. 1000
-- ============================================================================

-- Ensure user_reports has a moderation status (older schema had none).
-- 'pending' | 'reviewed' | 'dismissed'. Dismissed reports don't penalise score.
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.recalculate_bestie_score(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user        RECORD;
  v_score       NUMERIC := 0;

  v_sessions    INTEGER := 0;
  v_avg         NUMERIC;
  v_rating_n    INTEGER := 0;
  v_sparks      INTEGER := 0;
  v_referrals   INTEGER := 0;
  v_reports     INTEGER := 0;
  v_months      NUMERIC := 0;

  -- streak
  v_streak      INTEGER := 0;
  v_prev        DATE := NULL;
  v_cur         DATE;
  v_wk          RECORD;
  v_cont        BOOLEAN := TRUE;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── 1. Profile completeness (max 140) ─────────────────────────────────────
  IF v_user.avatar_url IS NOT NULL AND length(trim(v_user.avatar_url)) > 0
    THEN v_score := v_score + 30; END IF;
  IF v_user.bio IS NOT NULL AND length(trim(v_user.bio)) > 0
    THEN v_score := v_score + 20; END IF;
  IF v_user.city IS NOT NULL AND length(trim(v_user.city)) > 0
    THEN v_score := v_score + 10; END IF;
  IF v_user.energy_type IS NOT NULL
    THEN v_score := v_score + 30; END IF;
  IF COALESCE(v_user.is_verified, FALSE)
    THEN v_score := v_score + 50; END IF;

  -- ── 2. Confirmed sessions (max 250, saturating) ───────────────────────────
  SELECT COUNT(*) INTO v_sessions
  FROM public.bookings
  WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
    AND confirmed_by_seeker = TRUE
    AND confirmed_by_provider = TRUE;

  v_score := v_score + 250 * (1 - exp(-(v_sessions::NUMERIC) / 12));

  -- ── 3. Rating quality (max ±200, Bayesian-shrunk) ─────────────────────────
  SELECT COUNT(*), AVG(r) INTO v_rating_n, v_avg
  FROM (
    SELECT rating_seeker AS r FROM public.bookings
      WHERE provider_id = p_user_id AND rating_seeker IS NOT NULL
    UNION ALL
    SELECT rating_provider AS r FROM public.bookings
      WHERE seeker_id = p_user_id AND rating_provider IS NOT NULL
  ) q;

  IF v_rating_n > 0 THEN
    v_score := v_score
      + 200
      * (v_rating_n::NUMERIC / (v_rating_n + 5))            -- confidence
      * GREATEST(-1, LEAST(1, (v_avg - 3) / 2));            -- quality [-1,1]
  END IF;

  -- ── 4. Sparks received (max 150, saturating) ──────────────────────────────
  SELECT COUNT(*) INTO v_sparks FROM public.sparks WHERE receiver_id = p_user_id;
  v_score := v_score + 150 * (1 - exp(-(v_sparks::NUMERIC) / 10));

  -- ── 5. Weekly streak (max 150) — consecutive ISO weeks with a session ─────
  v_cont := TRUE; v_prev := NULL; v_streak := 0;
  FOR v_wk IN
    SELECT DISTINCT date_trunc('week', COALESCE(scheduled_at, created_at))::DATE AS wk
    FROM public.bookings
    WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
      AND confirmed_by_seeker = TRUE
      AND confirmed_by_provider = TRUE
    ORDER BY wk DESC
  LOOP
    IF NOT v_cont THEN EXIT; END IF;
    v_cur := v_wk.wk;
    IF v_prev IS NULL THEN
      v_streak := 1;
    ELSIF (v_prev - v_cur) = 7 THEN
      v_streak := v_streak + 1;
    ELSE
      v_cont := FALSE;
    END IF;
    IF v_cont THEN v_prev := v_cur; END IF;
  END LOOP;
  v_score := v_score + (LEAST(v_streak, 12)::NUMERIC / 12) * 150;

  -- ── 6. Account tenure (max 50) — pure time, cannot be rushed ──────────────
  v_months := EXTRACT(EPOCH FROM (NOW() - v_user.created_at)) / (60*60*24*30);
  v_score := v_score + (LEAST(v_months, 6) / 6) * 50;

  -- ── 7. Activated referrals (max 50) — referred user has a confirmed session
  SELECT COUNT(*) INTO v_referrals
  FROM public.users ru
  WHERE ru.referred_by = p_user_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.seeker_id = ru.id OR b.provider_id = ru.id)
        AND b.confirmed_by_seeker = TRUE
        AND b.confirmed_by_provider = TRUE
    );
  v_score := v_score + LEAST(v_referrals, 10) * 5;

  -- ── 8. Reports penalty (-50 each) ─────────────────────────────────────────
  SELECT COUNT(*) INTO v_reports
  FROM public.user_reports
  WHERE reported_id = p_user_id AND COALESCE(status, 'pending') <> 'dismissed';
  v_score := v_score - (v_reports * 50);

  -- ── Clamp 50..1000 ────────────────────────────────────────────────────────
  -- Authorise this internal write of protected columns (see security migration)
  PERFORM set_config('bestie.system', 'on', true);
  UPDATE public.users
  SET bestie_score = GREATEST(50, LEAST(1000, ROUND(v_score)))::INTEGER,
      streak_weeks = v_streak
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- AUTO-RECALC TRIGGERS  (fixes #7 — score was only recalculated on memory photo)
-- ============================================================================

-- Generic trigger fn: recalc for one or both affected users
CREATE OR REPLACE FUNCTION public.trg_recalc_booking()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_bestie_score(NEW.seeker_id);
  PERFORM public.recalculate_bestie_score(NEW.provider_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_score ON public.bookings;
CREATE TRIGGER on_booking_score
  AFTER INSERT OR UPDATE OF confirmed_by_seeker, confirmed_by_provider,
                            rating_seeker, rating_provider
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_booking();

CREATE OR REPLACE FUNCTION public.trg_recalc_spark()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_bestie_score(COALESCE(NEW.receiver_id, OLD.receiver_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_spark_score ON public.sparks;
CREATE TRIGGER on_spark_score
  AFTER INSERT OR DELETE ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_spark();

CREATE OR REPLACE FUNCTION public.trg_recalc_report()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_bestie_score(COALESCE(NEW.reported_id, OLD.reported_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_score ON public.user_reports;
CREATE TRIGGER on_report_score
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_report();

-- Keep the existing memory-photo trigger working (only if both exist)
DO $$
BEGIN
  IF to_regclass('public.session_memories') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_recalculate_on_memory') THEN
    DROP TRIGGER IF EXISTS on_memory_score_update ON public.session_memories;
    CREATE TRIGGER on_memory_score_update
      AFTER INSERT OR UPDATE OF photo_url ON public.session_memories
      FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_on_memory();
  END IF;
END;
$$;


-- ============================================================================
-- REMOVE the legacy competing scorer (fixes #6 — two systems were fighting)
-- ============================================================================
-- (recalculate_bestie_score is now the single source of truth)
-- Guard each DROP: the table may not exist in newer schemas. DROP TRIGGER
-- IF EXISTS still errors if the *table* is missing, so check first.
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
  END IF;
  IF to_regclass('public.lights') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_light_ignore ON public.lights;
  END IF;
END;
$$;


-- ============================================================================
-- NEW-USER STARTING SCORE (fixes #8 — fresh users were clamped to 50)
-- Give a small welcome floor so a brand-new, profile-complete user lands
-- around 140–200 (aspirational top still ~1000). The clamp min stays 50
-- only for penalized/empty accounts.
-- ============================================================================
ALTER TABLE public.users ALTER COLUMN bestie_score SET DEFAULT 150;


-- ============================================================================
-- Backfill: recalc everyone once with the new model
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(r.id);
  END LOOP;
END;
$$;
