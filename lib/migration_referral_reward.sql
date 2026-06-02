-- BESTIE — Two-sided referral reward (Step 1 of growth loop)
-- Re-runnable. Replaces apply_referral() so BOTH sides get rewarded when a
-- new user signs up with someone's referral code.
--
-- Why Sparks (not Bestie Score)? bestie_score is recomputed from sessions /
-- sparks-received by triggers, so a manual +score would get wiped on the next
-- recompute. sparks_balance (the spendable Sparks wallet) is persistent and is
-- already how other rewards work (platinum, crew roles). Sparks also feed the
-- score indirectly once they're sent and received.

-- Make sure the columns we rely on exist.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sparks_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

CREATE OR REPLACE FUNCTION public.apply_referral(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
  v_reward    INTEGER := 10;  -- Sparks each side earns
  v_newbie    UUID := auth.uid();
BEGIN
  IF v_newbie IS NULL THEN RETURN FALSE; END IF;

  -- Find referrer by code
  SELECT id INTO referrer_id FROM public.users WHERE referral_code = UPPER(p_code);

  -- Code not found
  IF referrer_id IS NULL THEN RETURN FALSE; END IF;

  -- Prevent self-referral and double-referral
  IF referrer_id = v_newbie THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_newbie AND referred_by IS NOT NULL) THEN
    RETURN FALSE;
  END IF;

  -- Mark who referred this user
  UPDATE public.users SET referred_by = referrer_id WHERE id = v_newbie;

  -- Reward BOTH sides with Sparks
  UPDATE public.users
    SET sparks_balance = COALESCE(sparks_balance, 0) + v_reward
    WHERE id IN (referrer_id, v_newbie);

  -- Notify the referrer
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    referrer_id,
    'referral_reward',
    '🎉 A friend joined Bestie! +' || v_reward || ' Sparks',
    'Someone signed up with your invite link. Enjoy ' || v_reward || ' Sparks — invite more to earn more!',
    '/dashboard'
  );

  -- Notify the new user (welcome bonus)
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_newbie,
    'referral_reward',
    '🎁 Welcome bonus: +' || v_reward || ' Sparks',
    'You joined through a friend''s invite — here are ' || v_reward || ' Sparks to get you started.',
    '/dashboard'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
