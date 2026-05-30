-- ══════════════════════════════════════════════════════════════════
-- Quest Automation
-- 1. Auto-assign onboarding quests on new user registration
-- 2. Auto-complete quests when user performs the action
-- 3. Award XP / BS / Sparks on completion
-- ══════════════════════════════════════════════════════════════════

-- ── Helper: complete a quest + award rewards ──────────────────────
CREATE OR REPLACE FUNCTION public.complete_quest(p_user_id UUID, p_slug TEXT)
RETURNS VOID AS $$
DECLARE
  v_quest     public.quests%ROWTYPE;
  v_uq_id     UUID;
BEGIN
  -- Find the quest
  SELECT * INTO v_quest FROM public.quests WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;

  -- Check it's active for this user (not already completed)
  SELECT id INTO v_uq_id
  FROM public.user_quests
  WHERE user_id = p_user_id AND quest_id = v_quest.id AND status = 'active';
  IF NOT FOUND THEN RETURN; END IF;

  -- Mark completed
  UPDATE public.user_quests
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_uq_id;

  -- Award companion XP
  UPDATE public.companions
  SET xp     = xp + v_quest.xp_reward,
      level  = LEAST(10, FLOOR((xp + v_quest.xp_reward) / 100) + 1),
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Award Bestie Score bonus
  IF v_quest.bs_reward > 0 THEN
    UPDATE public.users
    SET bestie_score = LEAST(1000, bestie_score + v_quest.bs_reward)
    WHERE id = p_user_id;
  END IF;

  -- Award Sparks bonus
  IF v_quest.sparks_reward > 0 THEN
    UPDATE public.users
    SET sparks_balance = COALESCE(sparks_balance, 0) + v_quest.sparks_reward
    WHERE id = p_user_id;
  END IF;

  -- In-app notification
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    p_user_id,
    'quest_completed',
    '🎯 Quest completed: ' || v_quest.title,
    'You earned ' || v_quest.xp_reward || ' XP' ||
      CASE WHEN v_quest.bs_reward > 0    THEN ' + ' || v_quest.bs_reward || ' BS'     ELSE '' END ||
      CASE WHEN v_quest.sparks_reward > 0 THEN ' + ' || v_quest.sparks_reward || ' ⚡' ELSE '' END,
    '/dashboard'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 1. Auto-assign onboarding quests on new user ──────────────────
CREATE OR REPLACE FUNCTION public.assign_onboarding_quests()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_quests (user_id, quest_id)
  SELECT NEW.id, id FROM public.quests
  WHERE quest_type IN ('onboarding', 'daily')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_assign_quests ON public.users;
CREATE TRIGGER on_user_created_assign_quests
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_onboarding_quests();


-- ── 2a. Quest: add_avatar — when avatar_url is set ────────────────
CREATE OR REPLACE FUNCTION public.quest_check_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != ''
     AND (OLD.avatar_url IS NULL OR OLD.avatar_url = '') THEN
    PERFORM public.complete_quest(NEW.id, 'add_avatar');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_avatar_set ON public.users;
CREATE TRIGGER on_avatar_set
  AFTER UPDATE OF avatar_url ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_avatar();


-- ── 2b. Quest: add_bio — when bio is set ─────────────────────────
CREATE OR REPLACE FUNCTION public.quest_check_bio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 10
     AND (OLD.bio IS NULL OR length(trim(OLD.bio)) <= 10) THEN
    PERFORM public.complete_quest(NEW.id, 'add_bio');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bio_set ON public.users;
CREATE TRIGGER on_bio_set
  AFTER UPDATE OF bio ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_bio();


-- ── 2c. Quest: bestie_type — when quiz is completed ───────────────
CREATE OR REPLACE FUNCTION public.quest_check_bestie_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.energy_type IS NOT NULL AND OLD.energy_type IS NULL THEN
    PERFORM public.complete_quest(NEW.id, 'bestie_type');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bestie_type_set ON public.users;
CREATE TRIGGER on_bestie_type_set
  AFTER UPDATE OF energy_type ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_bestie_type();


-- ── 2d. Quest: first_spark — when user sends first spark ─────────
CREATE OR REPLACE FUNCTION public.quest_check_first_spark()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.complete_quest(NEW.giver_id, 'first_spark');
  PERFORM public.complete_quest(NEW.giver_id, 'daily_spark');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_spark_sent ON public.sparks;
CREATE TRIGGER on_spark_sent
  AFTER INSERT ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_first_spark();


-- ── 2e. Quest: join_crew — when user joins a crew ─────────────────
CREATE OR REPLACE FUNCTION public.quest_check_join_crew()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.complete_quest(NEW.user_id, 'join_crew');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_crew_joined ON public.crew_members;
CREATE TRIGGER on_crew_joined
  AFTER INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_join_crew();


-- ── 2f. Quest: first_session + weekly_session ─────────────────────
CREATE OR REPLACE FUNCTION public.quest_check_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed_by_seeker = true AND NEW.confirmed_by_provider = true
     AND (OLD.confirmed_by_seeker = false OR OLD.confirmed_by_provider = false) THEN
    PERFORM public.complete_quest(NEW.seeker_id,   'first_session');
    PERFORM public.complete_quest(NEW.provider_id, 'first_session');
    PERFORM public.complete_quest(NEW.seeker_id,   'weekly_session');
    PERFORM public.complete_quest(NEW.provider_id, 'weekly_session');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_confirmed ON public.bookings;
CREATE TRIGGER on_session_confirmed
  AFTER UPDATE OF confirmed_by_seeker, confirmed_by_provider ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.quest_check_session();


-- ── Reset daily/weekly quests via cron ───────────────────────────
CREATE OR REPLACE FUNCTION public.reset_periodic_quests()
RETURNS VOID AS $$
BEGIN
  -- Reset daily quests (re-activate for all users who completed them)
  UPDATE public.user_quests uq
  SET status = 'active', completed_at = NULL
  FROM public.quests q
  WHERE uq.quest_id = q.id
    AND q.quest_type = 'daily'
    AND uq.status = 'completed'
    AND uq.completed_at < NOW() - INTERVAL '1 day';

  -- Reset weekly quests
  UPDATE public.user_quests uq
  SET status = 'active', completed_at = NULL
  FROM public.quests q
  WHERE uq.quest_id = q.id
    AND q.quest_type = 'weekly'
    AND uq.status = 'completed'
    AND uq.completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run at 00:00 UTC every day
SELECT cron.schedule(
  'reset-periodic-quests',
  '0 0 * * *',
  $$SELECT public.reset_periodic_quests();$$
);
