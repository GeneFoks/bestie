-- ══════════════════════════════════════════════════════════════════
-- Bestie Plus — personal ($8/mo) subscription
-- RE-RUNNABLE: safe to run multiple times.
-- Unlocks for an individual user:
--   • Premium AI companion + connect your own AI API key
--   • Appear on the connection graph (opt-in node, even with 0 sessions)
--   • Create PAID sessions / activity packages
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Allow the 'plus' tier ────────────────────────────────────────
-- Create the column first if this DB never had it, then (re)apply the check.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'basic', 'pro', 'organizer', 'plus'));

-- ── 2. Personal subscription bookkeeping ────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plus_expires_at         TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;

-- ── 3. Premium companion: bring-your-own AI key (Step 2) ────────────
ALTER TABLE public.companions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'claude'
  CHECK (provider IN ('claude', 'openai', 'grok'));
ALTER TABLE public.companions ADD COLUMN IF NOT EXISTS api_key TEXT;

-- ── 4. Opt-in graph presence (Step 3) ───────────────────────────────
-- Plus members can choose to appear on the graph even with no sessions.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_on_graph BOOLEAN DEFAULT FALSE;
