-- ══════════════════════════════════════════════════════════════════
-- Bestie AI Companion System
-- ══════════════════════════════════════════════════════════════════

-- Companion config per user
CREATE TABLE IF NOT EXISTS public.companions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  type         TEXT NOT NULL DEFAULT 'spark' CHECK (type IN ('spark', 'sage', 'nova')),
  name         TEXT NOT NULL DEFAULT 'Bestie',
  level        INTEGER NOT NULL DEFAULT 1,
  xp           INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companion_own" ON public.companions FOR ALL USING (auth.uid() = user_id);

-- Companion chat messages (history per user)
CREATE TABLE IF NOT EXISTS public.companion_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companion_messages_user ON public.companion_messages(user_id, created_at DESC);
ALTER TABLE public.companion_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companion_msg_own" ON public.companion_messages FOR ALL USING (auth.uid() = user_id);

-- Quests catalogue
CREATE TABLE IF NOT EXISTS public.quests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '⚡',
  xp_reward   INTEGER NOT NULL DEFAULT 50,
  bs_reward   INTEGER NOT NULL DEFAULT 0,
  sparks_reward INTEGER NOT NULL DEFAULT 0,
  quest_type  TEXT NOT NULL DEFAULT 'onboarding' CHECK (quest_type IN ('onboarding', 'daily', 'weekly', 'story')),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- User quest progress
CREATE TABLE IF NOT EXISTS public.user_quests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quest_id     UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_quests_own" ON public.user_quests FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests_read_all" ON public.quests FOR SELECT USING (TRUE);

-- ── Seed quests ───────────────────────────────────────────────────
INSERT INTO public.quests (slug, title, description, icon, xp_reward, bs_reward, sparks_reward, quest_type, sort_order)
VALUES
  ('add_avatar',       'Put a face to your name',     'Upload a profile photo',                               '📸', 100, 0,  0,  'onboarding', 1),
  ('add_bio',          'Tell your story',             'Write something in your bio',                          '✍️', 50,  0,  0,  'onboarding', 2),
  ('first_spark',      'Send your first Spark',       'Send a Spark to someone on Bestie',                    '⚡', 100, 20, 0,  'onboarding', 3),
  ('join_crew',        'Find your crew',              'Join or create a Crew',                                '👥', 150, 0,  5,  'onboarding', 4),
  ('first_session',    'Meet someone IRL',            'Complete your first session with someone',             '🤝', 200, 0,  10, 'onboarding', 5),
  ('bestie_type',      'Know thyself',                'Complete the Bestie Type quiz',                        '🔮', 75,  0,  0,  'onboarding', 6),
  ('daily_spark',      'Spark of the day',            'Send a Spark today',                                   '⚡', 30,  0,  0,  'daily',      1),
  ('daily_profile',    'Check your vibe',             'Visit your own profile today',                         '👤', 10,  0,  0,  'daily',      2),
  ('weekly_session',   'Consistent connector',        'Complete a session this week',                         '🗓️', 100, 0,  5,  'weekly',     1),
  ('weekly_message',   'Keep the conversation alive', 'Send 3 messages this week',                            '💬', 50,  0,  0,  'weekly',     2)
ON CONFLICT (slug) DO NOTHING;
