-- ══════════════════════════════════════════════════════════════════
-- AI Swarm for Crews
-- ══════════════════════════════════════════════════════════════════

-- 1. Add plan tier + Stripe fields to crews
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
    CHECK (plan IN ('free', 'community', 'pro')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. AI agent per crew member
--    Each member describes their skills / what they can help with.
--    Optional: connect their own API key for a personalized agent.
CREATE TABLE IF NOT EXISTS public.crew_ai_agents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  crew_id     UUID NOT NULL REFERENCES public.crews(id)  ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'claude'
              CHECK (provider IN ('claude', 'openai', 'grok')),
  api_key     TEXT,                    -- optional, user's own key
  skills      TEXT NOT NULL,           -- plain-text: what you can help with
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, crew_id)
);

ALTER TABLE public.crew_ai_agents ENABLE ROW LEVEL SECURITY;

-- Members can read all agents in their crew
CREATE POLICY "crew members read agents"
  ON public.crew_ai_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_ai_agents.crew_id
        AND cm.user_id = auth.uid()
    )
  );

-- Users manage their own agent
CREATE POLICY "users manage own agent"
  ON public.crew_ai_agents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Swarm request history
CREATE TABLE IF NOT EXISTS public.swarm_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id       UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  requester_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query         TEXT NOT NULL,
  result        JSONB,          -- array of { user_id, name, reason, score }
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.swarm_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crew members read swarm history"
  ON public.swarm_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_requests.crew_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "crew members insert swarm requests"
  ON public.swarm_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = swarm_requests.crew_id
        AND cm.user_id = auth.uid()
    )
  );
