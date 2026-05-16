-- Platinum Sparks Reward
-- When a user's bestie_score reaches 800 for the first time → +30 sparks_balance
-- + in-app notification

-- 1. Track whether reward was already given (so it only fires once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sparks_platinum_rewarded BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Function that awards the bonus
CREATE OR REPLACE FUNCTION public.award_platinum_sparks()
RETURNS TRIGGER AS $$
BEGIN
  -- Crossed 800 threshold going upward, and hasn't been rewarded yet
  IF OLD.bestie_score < 800 AND NEW.bestie_score >= 800 AND NOT NEW.sparks_platinum_rewarded THEN

    -- Give 30 sparks
    UPDATE public.users
    SET
      sparks_balance         = COALESCE(sparks_balance, 0) + 30,
      sparks_platinum_rewarded = TRUE
    WHERE id = NEW.id;

    -- In-app notification
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.id,
      'platinum_reward',
      '🏆 Platinum achieved! +30 Sparks',
      'You''ve reached 800 Bestie Score — Platinum tier. Here are 30 Sparks as a reward!',
      '/dashboard'
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger fires after bestie_score is updated
DROP TRIGGER IF EXISTS on_platinum_reached ON public.users;
CREATE TRIGGER on_platinum_reached
  AFTER UPDATE OF bestie_score ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.award_platinum_sparks();

-- 4. Back-fill: reward existing users already at 800+ who haven't been rewarded
UPDATE public.users
SET
  sparks_balance           = COALESCE(sparks_balance, 0) + 30,
  sparks_platinum_rewarded = TRUE
WHERE bestie_score >= 800
  AND sparks_platinum_rewarded = FALSE;
