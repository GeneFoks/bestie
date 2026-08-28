-- ============================================================================
-- BESTIE — Fire Quests (shared daily habits: light a fire, keep it blazing)
-- Idempotent / safe to re-run.
--
-- IMPORTANT — table collision handled here:
-- Production already has a `public.quests` table (legacy onboarding catalog:
-- slug/icon/xp_reward/quest_type, read via user_quests joins in
-- CompanionWidget, OnboardingProgress and /api/companion/nudge). It must NOT
-- be dropped or renamed. This migration EXTENDS it in place with the fire
-- quest columns, gives the legacy NOT NULL columns defaults (so the client
-- can insert the new shape), and deactivates the legacy catalog rows
-- (creator_id IS NULL → is_active = false). Legacy code never reads
-- is_active, so nothing breaks; the new UI filters on is_active = true.
--
-- Flow:
--   * creating a fire  → client INSERT into quests (creator_id = auth.uid())
--                        + client INSERT of own row into quest_members
--   * joining a fire   → rpc quest_join(p_quest_id)   (+2 Sparks once)
--   * daily check-in   → rpc quest_checkin(p_quest_id)
--   * badge levels     → activity_reps: 10 → I (+5), 100 → II (+15),
--                        1000 → III (+50)
-- ============================================================================

-- ── 1. Tables ───────────────────────────────────────────────────────────────

-- 1a. quests — no-op in prod (legacy table exists); real shape on a fresh DB
CREATE TABLE IF NOT EXISTS public.quests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  activity_type  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  is_active      BOOLEAN DEFAULT TRUE,
  first_blaze_at TIMESTAMPTZ
);

-- Bring the legacy table up to the contract (each is a no-op when present)
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS first_blaze_at TIMESTAMPTZ;

-- Legacy NOT NULL columns need defaults so the client can insert just
-- (creator_id, title, activity_type). Guarded — they don't exist on a fresh DB.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'quests' AND column_name = 'slug') THEN
    ALTER TABLE public.quests
      ALTER COLUMN slug SET DEFAULT substr(md5((random())::text || (clock_timestamp())::text), 1, 10);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'quests' AND column_name = 'description') THEN
    ALTER TABLE public.quests ALTER COLUMN description SET DEFAULT '';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'quests' AND column_name = 'quest_type') THEN
    ALTER TABLE public.quests ALTER COLUMN quest_type SET DEFAULT 'fire';
  END IF;
END $$;

-- Retire the legacy onboarding catalog from the new UI (they keep working
-- through user_quests joins — legacy code never reads is_active)
UPDATE public.quests
SET is_active = FALSE
WHERE creator_id IS NULL AND is_active IS DISTINCT FROM FALSE;

CREATE INDEX IF NOT EXISTS idx_quests_creator ON public.quests(creator_id);
CREATE INDEX IF NOT EXISTS idx_quests_active_created ON public.quests(is_active, created_at DESC);

-- 1b. quest_members — who sits at each fire
CREATE TABLE IF NOT EXISTS public.quest_members (
  quest_id  UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_members_user ON public.quest_members(user_id);

-- 1c. quest_checkins — one row per member per day; reps is how much the
--     check-in counted (1 alone, team_size once the whole team showed up)
CREATE TABLE IF NOT EXISTS public.quest_checkins (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day      DATE NOT NULL DEFAULT CURRENT_DATE,
  reps     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (quest_id, user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_quest_checkins_quest_day ON public.quest_checkins(quest_id, day);

-- 1d. activity_reps — lifetime reps per user per activity (badge levels)
CREATE TABLE IF NOT EXISTS public.activity_reps (
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  reps          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, activity_type)
);

-- ── 2. RLS — the world is public flex; writes go through the RPCs ───────────

ALTER TABLE public.quests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reps  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quests are public" ON public.quests;
CREATE POLICY "Quests are public"
  ON public.quests FOR SELECT
  USING (true);

-- Creation is the ONE direct client write: you may light your own fire
DROP POLICY IF EXISTS "Create own quests" ON public.quests;
CREATE POLICY "Create own quests"
  ON public.quests FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Quest members are public" ON public.quest_members;
CREATE POLICY "Quest members are public"
  ON public.quest_members FOR SELECT
  USING (true);

-- The creator seeds their own membership at creation time; everyone else
-- joins via quest_join()
DROP POLICY IF EXISTS "Creator seeds own membership" ON public.quest_members;
CREATE POLICY "Creator seeds own membership"
  ON public.quest_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Quest checkins are public" ON public.quest_checkins;
CREATE POLICY "Quest checkins are public"
  ON public.quest_checkins FOR SELECT
  USING (true);
-- (no client write policies — check-ins happen only via quest_checkin())

DROP POLICY IF EXISTS "Activity reps are public" ON public.activity_reps;
CREATE POLICY "Activity reps are public"
  ON public.activity_reps FOR SELECT
  USING (true);
-- (no client write policies — reps move only via the RPCs)

-- ── 3. quest_join — pull up a log, +2 Sparks once (not for the creator) ─────

DROP FUNCTION IF EXISTS public.quest_join(uuid);
CREATE OR REPLACE FUNCTION public.quest_join(p_quest_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_quest RECORD;
  v_name  TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'unauthorized';
  END IF;

  SELECT id, creator_id, title INTO v_quest
  FROM public.quests
  WHERE id = p_quest_id AND is_active IS TRUE AND creator_id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  INSERT INTO public.quest_members (quest_id, user_id)
  VALUES (p_quest_id, v_uid)
  ON CONFLICT (quest_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'already';
  END IF;

  -- +2 Sparks for joining — but lighting your own fire earns nothing
  IF v_uid <> v_quest.creator_id THEN
    UPDATE public.users
    SET
      sparks_balance  = COALESCE(sparks_balance, 0) + 2,
      sparks_received = COALESCE(sparks_received, 0) + 2
    WHERE id = v_uid;

    PERFORM public.log_sparks(v_uid, 2, 'Joined the fire — ' || v_quest.title, 'quest', v_quest.id);

    SELECT COALESCE(full_name, username, 'Someone') INTO v_name
    FROM public.users WHERE id = v_uid;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_quest.creator_id,
      'quest',
      v_name || ' joined your fire 🔥',
      'Your quest "' || v_quest.title || '" has a new member. Keep it blazing.',
      '/quests'
    );
  END IF;

  RETURN 'joined';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 4. quest_apply_reps — internal helper: add reps + handle level-ups ──────
-- NOT client-callable (revoked below). Returns the highest level crossed
-- by this addition, or NULL.

DROP FUNCTION IF EXISTS public.quest_apply_reps(uuid, text, integer);
CREATE OR REPLACE FUNCTION public.quest_apply_reps(p_user_id UUID, p_activity TEXT, p_add INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_old      INTEGER;
  v_new      INTEGER;
  v_level    INTEGER := NULL;
  v_label    TEXT;
  v_username TEXT;
  t          RECORD;
BEGIN
  IF p_add IS NULL OR p_add <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.activity_reps (user_id, activity_type, reps)
  VALUES (p_user_id, p_activity, p_add)
  ON CONFLICT (user_id, activity_type)
  DO UPDATE SET reps = activity_reps.reps + EXCLUDED.reps
  RETURNING reps INTO v_new;

  v_old := v_new - p_add;

  FOR t IN
    SELECT * FROM (VALUES (10, 1, 5, 'I'), (100, 2, 15, 'II'), (1000, 3, 50, 'III'))
      AS lv(threshold, lvl, sparks, roman)
  LOOP
    IF v_old < t.threshold AND v_new >= t.threshold THEN
      v_level := t.lvl;
      v_label := replace(initcap(p_activity), '_', ' ');

      UPDATE public.users
      SET
        sparks_balance  = COALESCE(sparks_balance, 0) + t.sparks,
        sparks_received = COALESCE(sparks_received, 0) + t.sparks
      WHERE id = p_user_id
      RETURNING username INTO v_username;

      PERFORM public.log_sparks(p_user_id, t.sparks, v_label || ' badge → level ' || t.roman, 'badge', NULL);

      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        p_user_id,
        'badge',
        v_label || ' badge leveled up! 🔥',
        'Level ' || t.roman || ' — ' || t.threshold || ' ' || v_label || ' reps. +' || t.sparks || ' Sparks.',
        '/' || v_username
      );
    END IF;
  END LOOP;

  RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 5. quest_checkin — today's rep; team completion multiplies it ───────────

DROP FUNCTION IF EXISTS public.quest_checkin(uuid);
CREATE OR REPLACE FUNCTION public.quest_checkin(p_quest_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_quest       RECORD;
  v_activity    TEXT;
  v_inserted    BOOLEAN;
  v_team        INTEGER;
  v_checked     INTEGER;
  v_day_complete BOOLEAN := FALSE;
  v_new_level   INTEGER := NULL;
  v_bonus_level INTEGER;
  v_rows        INTEGER;
  r             RECORD;
BEGIN
  SELECT id, creator_id, title, activity_type, first_blaze_at INTO v_quest
  FROM public.quests
  WHERE id = p_quest_id AND is_active IS TRUE;

  IF v_uid IS NULL OR NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.quest_members
    WHERE quest_id = p_quest_id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object(
      'status', 'not_member', 'day_complete', FALSE,
      'team_size', 0, 'new_level', NULL, 'activity_type', NULL
    );
  END IF;

  -- activity_reps PK forbids NULL activity_type
  v_activity := COALESCE(v_quest.activity_type, 'general');

  INSERT INTO public.quest_checkins (quest_id, user_id)
  VALUES (p_quest_id, v_uid)
  ON CONFLICT (quest_id, user_id, day) DO NOTHING;
  v_inserted := FOUND;

  SELECT COUNT(*) INTO v_team
  FROM public.quest_members WHERE quest_id = p_quest_id;

  SELECT COUNT(*) INTO v_checked
  FROM public.quest_checkins WHERE quest_id = p_quest_id AND day = CURRENT_DATE;

  IF NOT v_inserted THEN
    RETURN jsonb_build_object(
      'status', 'already',
      'day_complete', (v_checked >= v_team AND v_team >= 1),
      'team_size', v_team, 'new_level', NULL, 'activity_type', v_quest.activity_type
    );
  END IF;

  -- Your own rep always counts
  v_new_level := public.quest_apply_reps(v_uid, v_activity, 1);

  IF v_checked >= v_team AND v_team >= 1 THEN
    v_day_complete := TRUE;

    -- Whole team showed up → every check-in today counts team_size, so each
    -- member gains (team_size - 1) extra reps. The `reps = 1` guard makes a
    -- concurrent double-award impossible.
    IF v_team > 1 THEN
      UPDATE public.quest_checkins
      SET reps = v_team
      WHERE quest_id = p_quest_id AND day = CURRENT_DATE AND reps = 1;
      GET DIAGNOSTICS v_rows = ROW_COUNT;

      IF v_rows > 0 THEN
        FOR r IN SELECT user_id FROM public.quest_members WHERE quest_id = p_quest_id LOOP
          v_bonus_level := public.quest_apply_reps(r.user_id, v_activity, v_team - 1);
          IF r.user_id = v_uid AND v_bonus_level IS NOT NULL THEN
            v_new_level := v_bonus_level;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- First time the fire fully blazes
    IF v_quest.first_blaze_at IS NULL THEN
      UPDATE public.quests
      SET first_blaze_at = NOW()
      WHERE id = p_quest_id AND first_blaze_at IS NULL;

      IF FOUND AND v_team > 1 AND v_quest.creator_id IS NOT NULL THEN
        UPDATE public.users
        SET
          sparks_balance  = COALESCE(sparks_balance, 0) + 15,
          sparks_received = COALESCE(sparks_received, 0) + 15
        WHERE id = v_quest.creator_id;

        PERFORM public.log_sparks(v_quest.creator_id, 15, 'Lit a fire that caught — ' || v_quest.title, 'quest', p_quest_id);

        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          v_quest.creator_id,
          'quest',
          'Your fire caught! 🔥',
          'The whole team checked in on "' || v_quest.title || '". +15 Sparks.',
          '/quests'
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'checked',
    'day_complete', v_day_complete,
    'team_size', v_team,
    'new_level', v_new_level,
    'activity_type', v_quest.activity_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 6. Grants — the two RPCs are client-callable, the helper is NOT ─────────

GRANT EXECUTE ON FUNCTION public.quest_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quest_checkin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.quest_apply_reps(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Client API:
--   supabase.rpc('quest_join',    { p_quest_id })
--     → 'joined' | 'already' | 'not_found' | 'unauthorized'
--   supabase.rpc('quest_checkin', { p_quest_id })
--     → { status: 'checked'|'already'|'not_member', day_complete: bool,
--         team_size: int, new_level: int|null, activity_type: text }
-- Quest creation = client INSERT into quests (creator_id = auth.uid(),
-- title, activity_type) + client INSERT of own row into quest_members.
-- List fires with .eq('is_active', true) — legacy onboarding rows are
-- is_active = false and have creator_id IS NULL.
-- ============================================================================

-- ── Security follow-up: log_sparks must not be client-callable ──────────────
-- (SECURITY DEFINER + default EXECUTE would let any user write anyone's ledger
--  via PostgREST /rpc. Internal definer-to-definer calls keep working.)
REVOKE EXECUTE ON FUNCTION public.log_sparks(UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
