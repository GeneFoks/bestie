-- BESTIE — Phase 3: Roles + Contributions + Referrals
-- Run in Supabase SQL editor after migration_crew_invites.sql.

-- ==========================================
-- 1. ROLE on crew membership
-- ==========================================

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('captain', 'moderator', 'member'));

CREATE INDEX IF NOT EXISTS idx_crew_members_role ON public.crew_members(crew_id, role);

-- Backfill captain role from crews.captain_id
UPDATE public.crew_members cm
SET role = 'captain'
FROM public.crews c
WHERE c.id = cm.crew_id AND c.captain_id = cm.user_id AND cm.role <> 'captain';

-- Only captain (not moderators) can promote / demote
CREATE POLICY "Captain can change roles"
  ON public.crew_members FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

-- ==========================================
-- 2. CREW REFERRALS — who invited whom into a crew
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crew_referrals (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id      UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  referrer_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  referred_id  UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  sparked_at   TIMESTAMPTZ,
  UNIQUE (crew_id, referred_id) -- one referral per (crew, user)
);

CREATE INDEX IF NOT EXISTS idx_crew_referrals_crew_referrer ON public.crew_referrals(crew_id, referrer_id);

ALTER TABLE public.crew_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew members read referrals"
  ON public.crew_referrals FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_referrals.crew_id AND cm.user_id = auth.uid()
    )
  );

-- ==========================================
-- 3. RPC: join via invite WITH optional referrer attribution
--    Updates the original join_crew_via_invite to accept a referrer.
-- ==========================================

CREATE OR REPLACE FUNCTION public.join_crew_via_invite(
  p_crew_id     UUID,
  p_invite_code TEXT,
  p_referrer_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  member_count INTEGER;
  max_cap      INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crews WHERE id = p_crew_id AND invite_code = UPPER(p_invite_code)) THEN
    RETURN 'invalid_code';
  END IF;

  IF EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = p_crew_id AND user_id = auth.uid()) THEN
    RETURN 'already_member';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND crew_id IS NOT NULL AND crew_id != p_crew_id) THEN
    RETURN 'in_other_crew';
  END IF;

  SELECT COUNT(*), c.max_members INTO member_count, max_cap
  FROM public.crew_members cm
  JOIN public.crews c ON c.id = cm.crew_id
  WHERE cm.crew_id = p_crew_id
  GROUP BY c.max_members;

  IF max_cap IS NOT NULL AND member_count >= max_cap THEN
    RETURN 'full';
  END IF;

  -- Join
  INSERT INTO public.crew_members (crew_id, user_id, role)
    VALUES (p_crew_id, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;
  UPDATE public.users SET crew_id = p_crew_id WHERE id = auth.uid();

  -- Record the referral if provided and not self-referring
  IF p_referrer_id IS NOT NULL
     AND p_referrer_id <> auth.uid()
     AND EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = p_crew_id AND user_id = p_referrer_id) THEN
    INSERT INTO public.crew_referrals (crew_id, referrer_id, referred_id)
      VALUES (p_crew_id, p_referrer_id, auth.uid())
      ON CONFLICT DO NOTHING;

    -- Reward referrer with +1 spark balance (they earn one more spark to give)
    UPDATE public.users
      SET sparks_balance = COALESCE(sparks_balance, 0) + 1
      WHERE id = p_referrer_id;

    UPDATE public.crew_referrals
      SET sparked_at = NOW()
      WHERE crew_id = p_crew_id AND referred_id = auth.uid();
  END IF;

  UPDATE public.crew_join_requests
    SET status = 'accepted'
    WHERE crew_id = p_crew_id AND user_id = auth.uid() AND status = 'pending';

  RETURN 'joined';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. CREW MEMBER CONTRIBUTIONS — view computing per-member ranking
--    Weighted score based on visible activity inside the crew:
--      - events created   * 10
--      - 'going' RSVPs    *  3
--      - messages         *  1 (capped via daily activity, see comment)
--      - referrals        *  5
--    Sessions confirmed inside crew are tracked through the existing
--    bookings system; we approximate via session count tied to crew membership.
-- ==========================================

CREATE OR REPLACE VIEW public.crew_member_contributions AS
WITH event_counts AS (
  SELECT crew_id, created_by AS user_id, COUNT(*) AS n
  FROM public.crew_events
  WHERE created_by IS NOT NULL
  GROUP BY crew_id, created_by
),
rsvp_counts AS (
  SELECT e.crew_id, a.user_id, COUNT(*) AS n
  FROM public.crew_event_attendees a
  JOIN public.crew_events e ON e.id = a.event_id
  WHERE a.status = 'going'
  GROUP BY e.crew_id, a.user_id
),
msg_counts AS (
  SELECT crew_id, sender_id AS user_id, COUNT(*) AS n
  FROM public.crew_messages
  GROUP BY crew_id, sender_id
),
referral_counts AS (
  SELECT crew_id, referrer_id AS user_id, COUNT(*) AS n
  FROM public.crew_referrals
  WHERE referrer_id IS NOT NULL
  GROUP BY crew_id, referrer_id
)
SELECT
  cm.crew_id,
  cm.user_id,
  cm.role,
  COALESCE(ec.n, 0)                                   AS events_created,
  COALESCE(rc.n, 0)                                   AS rsvps_going,
  COALESCE(mc.n, 0)                                   AS messages_sent,
  COALESCE(refc.n, 0)                                 AS referrals_made,
  (COALESCE(ec.n, 0)   * 10
 + COALESCE(rc.n, 0)   *  3
 + LEAST(COALESCE(mc.n, 0), 100) -- cap message count at 100 to prevent spam
 + COALESCE(refc.n, 0) *  5)                         AS contribution_score
FROM public.crew_members cm
LEFT JOIN event_counts     ec   ON ec.crew_id   = cm.crew_id AND ec.user_id   = cm.user_id
LEFT JOIN rsvp_counts      rc   ON rc.crew_id   = cm.crew_id AND rc.user_id   = cm.user_id
LEFT JOIN msg_counts       mc   ON mc.crew_id   = cm.crew_id AND mc.user_id   = cm.user_id
LEFT JOIN referral_counts  refc ON refc.crew_id = cm.crew_id AND refc.user_id = cm.user_id;

-- ==========================================
-- 5. CREW BESTIE SCORE AGGREGATE — average bestie_score of members
--    Already covered by the existing crew_rankings view but let's expose
--    one canonical column on a fresh view that includes contribution data.
-- ==========================================

CREATE OR REPLACE VIEW public.crew_stats AS
SELECT
  c.id              AS crew_id,
  c.name,
  c.slug,
  c.avatar_url,
  COUNT(cm.user_id)                              AS member_count,
  ROUND(AVG(u.bestie_score))::INTEGER           AS avg_bestie_score,
  COALESCE(SUM(cmc.contribution_score), 0)::INTEGER AS total_contribution
FROM public.crews c
LEFT JOIN public.crew_members cm  ON cm.crew_id = c.id
LEFT JOIN public.users         u   ON u.id      = cm.user_id
LEFT JOIN public.crew_member_contributions cmc ON cmc.crew_id = c.id AND cmc.user_id = cm.user_id
GROUP BY c.id;
