-- ============================================================================
-- Paid Telegram group (@towerUSA via @TowerCrewBot) — storage
--
-- tg_subscriptions  one row per person per group; Stripe is the source of truth,
--                   the webhook mirrors status / plan / paid_until here.
--                   Only rows in this table are ever kicked or demoted —
--                   existing members (no row) are never touched.
-- tg_join_requests  pending join requests, so a payment can approve them.
-- tg_bot_users      people who pressed Start in the bot (= bot may DM them).
-- tg_bot_updates    Telegram update_id dedupe for the bot webhook.
-- stripe_events     Stripe event dedupe (processed_at set only on success).
--
-- All tables: RLS on, no policies → only the service role (server) can read
-- or write. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tg_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id                BIGINT NOT NULL,
  telegram_user_id       BIGINT NOT NULL,
  telegram_username      TEXT,
  user_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  plan                   TEXT NOT NULL CHECK (plan IN ('basic', 'admin')),
  status                 TEXT NOT NULL DEFAULT 'incomplete',  -- Stripe subscription status
  paid_until             TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id        TEXT,
  livemode               BOOLEAN NOT NULL DEFAULT false,
  was_member_before      BOOLEAN NOT NULL DEFAULT false,      -- was in the group before paying → never kick, only demote
  approved_at            TIMESTAMPTZ,
  promoted_at            TIMESTAMPTZ,
  removed_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, telegram_user_id)
);
CREATE INDEX IF NOT EXISTS tg_subscriptions_sweep_idx
  ON public.tg_subscriptions (paid_until) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.tg_join_requests (
  chat_id          BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  user_chat_id     BIGINT,
  username         TEXT,
  first_name       TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  PRIMARY KEY (chat_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS public.tg_bot_users (
  telegram_user_id BIGINT PRIMARY KEY,
  username         TEXT,
  first_name       TEXT,
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tg_bot_updates (
  update_id   BIGINT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id     TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.tg_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_bot_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_bot_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tg_subscriptions, public.tg_join_requests, public.tg_bot_users,
              public.tg_bot_updates, public.stripe_events
  FROM anon, authenticated;
