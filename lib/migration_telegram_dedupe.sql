-- ============================================================================
-- BESTIE — Telegram webhook dedupe
-- Telegram may deliver the same update to several serverless instances,
-- producing duplicate bot replies. The webhook claims each update_id here;
-- a duplicate insert (23505) means another instance already handled it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_updates (
  update_id  BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service-role only (the webhook uses the service key); no public access.
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;

-- Keep the table small: drop claims older than 2 days on each insert batch.
CREATE OR REPLACE FUNCTION public.cleanup_telegram_updates()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.telegram_updates WHERE created_at < NOW() - INTERVAL '2 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cleanup_telegram_updates ON public.telegram_updates;
CREATE TRIGGER trg_cleanup_telegram_updates
  AFTER INSERT ON public.telegram_updates
  FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_telegram_updates();
