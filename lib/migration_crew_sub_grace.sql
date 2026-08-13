-- ============================================================================
-- BESTIE — Grace deadline for paid crews
-- When a crew turns paid, existing free members get until this date to
-- subscribe. After it passes, a cron removes anyone (except the captain) who
-- isn't an active subscriber.
-- ============================================================================

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS sub_grace_until TIMESTAMPTZ;

-- Durable Bestie-user ↔ Telegram-user mapping per crew (captured at /verify),
-- so the bot can later kick non-subscribers from the linked Telegram group.
CREATE TABLE IF NOT EXISTS public.crew_telegram_members (
  crew_id          UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  chat_id          BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);
ALTER TABLE public.crew_telegram_members ENABLE ROW LEVEL SECURITY;
-- Service-role only (webhook writes, cron reads). No public policies.
