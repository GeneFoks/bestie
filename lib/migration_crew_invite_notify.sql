-- ══════════════════════════════════════════════════════════════════
-- Crew invite → notify the inviter when someone joins via their link
--
-- Replaces join_crew_via_invite() so that, in the SAME transaction as the
-- referral +1 Spark reward, an in-app notification is inserted for the
-- referrer: "<name> joined <crew> with your invite (+1 Spark)".
--
-- SECURITY DEFINER → the INSERT bypasses RLS (no client cookie session
-- needed, and the joining user can't normally write to the referrer's
-- notifications). Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.join_crew_via_invite(
  p_crew_id     UUID,
  p_invite_code TEXT,
  p_referrer_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  member_count  INTEGER;
  max_cap       INTEGER;
  v_joiner_name TEXT;
  v_crew_name   TEXT;
  v_crew_slug   TEXT;
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

    -- Notify the inviter on their bell
    SELECT COALESCE(full_name, username, 'Someone') INTO v_joiner_name
      FROM public.users WHERE id = auth.uid();
    SELECT name, slug INTO v_crew_name, v_crew_slug
      FROM public.crews WHERE id = p_crew_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      p_referrer_id,
      'crew_invite_joined',
      v_joiner_name || ' joined ' || COALESCE(v_crew_name, 'your crew') || ' with your invite 🎉',
      'You earned +1 Spark. Tap to see your crew.',
      '/crews/' || v_crew_slug
    );
  END IF;

  UPDATE public.crew_join_requests
    SET status = 'accepted'
    WHERE crew_id = p_crew_id AND user_id = auth.uid() AND status = 'pending';

  RETURN 'joined';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
