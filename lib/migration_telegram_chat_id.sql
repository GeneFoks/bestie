-- ══════════════════════════════════════════════════════════════════
-- Telegram crew linking → per-crew chat id (any crew, not just one)
--
-- Previously the Telegram bot was hardwired to a single crew via the
-- TELEGRAM_CREW_SLUG env var. Instead, store the linked Telegram group's
-- chat id on the crew itself, so the bot can resolve which crew a join
-- request belongs to by the group it came from.
--
-- A captain links their group by sending  /link <crew invite code>  in the
-- group; the bot writes that group's chat id here. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- One Telegram group maps to at most one crew.
CREATE UNIQUE INDEX IF NOT EXISTS crews_telegram_chat_id_key
  ON public.crews (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
