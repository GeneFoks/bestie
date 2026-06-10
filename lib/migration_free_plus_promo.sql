-- ══════════════════════════════════════════════════════════════════
-- Promo → free Bestie Plus for everyone through the end of 2026
--
-- Grants every current user the 'plus' tier with an expiry of
-- 2026-12-31 23:59:59 UTC, and auto-applies the same grant to anyone who
-- signs up before that deadline. After the deadline the trigger stops
-- granting and normal (Stripe-driven) subscriptions take over.
--
-- We never SHORTEN an existing subscription: GREATEST keeps whatever is
-- later between the user's current expiry and the promo deadline, so a
-- real paying member who already has a longer term isn't downgraded.
--
-- Plus is read elsewhere as: subscription_tier = 'plus'
--   AND (plus_expires_at IS NULL OR plus_expires_at > NOW())
-- so this just works with the existing gates (crews, etc.). Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- 1) Grant to all existing users (without shortening longer subscriptions).
UPDATE public.users
   SET subscription_tier = 'plus',
       plus_expires_at = GREATEST(
         COALESCE(plus_expires_at, TIMESTAMPTZ '1970-01-01'),
         TIMESTAMPTZ '2026-12-31 23:59:59+00'
       )
 WHERE plus_expires_at IS NULL
    OR plus_expires_at < TIMESTAMPTZ '2026-12-31 23:59:59+00';

-- 2) New sign-ups get the same promo automatically, until the deadline.
CREATE OR REPLACE FUNCTION public.grant_free_plus_promo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOW() < TIMESTAMPTZ '2026-12-31 23:59:59+00' THEN
    -- Only lift them to the promo expiry; never shorten a longer term.
    IF NEW.plus_expires_at IS NULL
       OR NEW.plus_expires_at < TIMESTAMPTZ '2026-12-31 23:59:59+00' THEN
      NEW.subscription_tier := 'plus';
      NEW.plus_expires_at   := TIMESTAMPTZ '2026-12-31 23:59:59+00';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_free_plus_promo ON public.users;
CREATE TRIGGER trg_grant_free_plus_promo
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_free_plus_promo();
