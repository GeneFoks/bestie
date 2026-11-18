-- ============================================================================
-- @TowerCrewBot («Вышки в США») — Mini App, Telegram ↔ Bestie link,
-- review wizard, clean group chat.
-- Run AFTER lib/migration_tower_teams.sql. Safe to re-run.
--
-- tg_bestie_links        one Telegram account ↔ one Bestie account. Written only
--                        by the server after the person confirmed it on
--                        /tower/link (never a column on public.users — people
--                        can edit their own users row).
-- tg_people +            hidden_from_rating / skills / state (Mini App «Я»).
-- tg_reviews +           the review wizard: where + when they worked together,
--                        a score per criterion (null = не применимо), «работал
--                        бы снова», and the reviewed person's answer «работали
--                        вместе?» (confirmed_at / disputed_at). rating stays the
--                        rounded average of the rated criteria.
-- tg_ephemeral_messages  the bot's short group replies, deleted after ~60 s.
-- tg_bot_settings        small key → value store (the pinned app message).
--
-- RLS on, no policies → only the service role (server) can read or write.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tg_bestie_links (
  telegram_user_id  BIGINT PRIMARY KEY,
  user_id           UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tg_people ADD COLUMN IF NOT EXISTS hidden_from_rating BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tg_people ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(skills) <= 12);
ALTER TABLE public.tg_people ADD COLUMN IF NOT EXISTS state TEXT
  CHECK (state IS NULL OR state ~ '^[A-Z]{2}$');

ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS work_place TEXT
  CHECK (work_place IS NULL OR char_length(work_place) BETWEEN 2 AND 80);
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS work_month SMALLINT
  CHECK (work_month IS NULL OR work_month BETWEEN 1 AND 12);
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS work_year SMALLINT
  CHECK (work_year IS NULL OR work_year BETWEEN 2000 AND 2100);
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS scores JSONB
  CHECK (scores IS NULL OR jsonb_typeof(scores) = 'object');
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS would_work_again BOOLEAN;
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS disputed_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS tg_reviews_disputed_idx
  ON public.tg_reviews (disputed_at DESC) WHERE disputed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tg_ephemeral_messages (
  chat_id      BIGINT NOT NULL,
  message_id   BIGINT NOT NULL,
  delete_after TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chat_id, message_id)
);
CREATE INDEX IF NOT EXISTS tg_ephemeral_messages_due_idx
  ON public.tg_ephemeral_messages (delete_after);

CREATE TABLE IF NOT EXISTS public.tg_bot_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tg_bestie_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_ephemeral_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_bot_settings       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tg_bestie_links, public.tg_ephemeral_messages, public.tg_bot_settings,
              public.tg_people, public.tg_reviews
  FROM anon, authenticated;

-- PostgREST: pick up the new tables / columns right away.
NOTIFY pgrst, 'reload schema';
