-- ============================================================================
-- BESTIE — Paid crew subscriptions (Stripe Connect, destination charges)
-- A crew captain connects a Stripe account, sets a monthly price + what's
-- included, and members subscribe. Stripe takes Bestie's 10% platform fee and
-- routes the rest to the captain's connected account (automatic payouts).
-- Generic: any crew can use it (pickleball first, anything after).
-- ============================================================================

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS stripe_connect_id        TEXT,     -- captain's connected acct
  ADD COLUMN IF NOT EXISTS connect_charges_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sub_price                NUMERIC,  -- USD / month
  ADD COLUMN IF NOT EXISTS sub_description          TEXT,     -- "what you get"
  ADD COLUMN IF NOT EXISTS sub_active               BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.crew_subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id                UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  user_id                UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',  -- active | canceled | past_due
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (crew_id, user_id)
);

ALTER TABLE public.crew_subscriptions ENABLE ROW LEVEL SECURITY;
-- Members see their own subs; captains see their crew's subscribers.
CREATE POLICY "own or captain reads crew subs" ON public.crew_subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.crews c WHERE c.id = crew_id AND c.captain_id = auth.uid())
  );
-- All writes go through the Stripe webhook (service role) — no client writes.

CREATE INDEX IF NOT EXISTS idx_crew_subs_crew ON public.crew_subscriptions(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_subs_user ON public.crew_subscriptions(user_id);
