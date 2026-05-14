-- Stores pending Telegram join requests while user registers on Bestie
CREATE TABLE IF NOT EXISTS telegram_pending_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  telegram_username TEXT,
  chat_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — only accessed by service role from webhook
CREATE INDEX IF NOT EXISTS tpj_telegram_user_id_idx ON telegram_pending_joins(telegram_user_id);
