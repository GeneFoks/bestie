-- BESTIE — Unique badges, starting with "City Pioneer"
-- Re-runnable / idempotent. Awards a permanent crest badge + 25 Sparks to the
-- first Bestie in each city, with an in-app notification.
--
-- Badge rows are PUBLIC (they render on the Social Passport) but only the
-- SECURITY DEFINER trigger can create them — no client INSERT policy exists.

-- 1. Badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  city TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges(user_id);

-- Speeds up the "is anyone already in this city" check in the trigger.
CREATE INDEX IF NOT EXISTS users_city_norm_idx ON public.users (lower(trim(city)));

-- 2. RLS: badges are public flex; nobody writes from the client.
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Badges are public" ON public.user_badges;
CREATE POLICY "Badges are public"
  ON public.user_badges FOR SELECT
  USING (true);
-- (intentionally NO insert/update/delete policies — writes happen only via
--  the SECURITY DEFINER function below, which bypasses RLS)

-- 3. Award function: first user to claim a city gets the City Pioneer crest
CREATE OR REPLACE FUNCTION public.award_city_pioneer()
RETURNS TRIGGER AS $$
DECLARE
  v_city_norm   TEXT;
  v_city_pretty TEXT;
BEGIN
  -- No city, no pioneer
  IF NEW.city IS NULL OR trim(NEW.city) = '' THEN
    RETURN NEW;
  END IF;

  v_city_norm   := lower(trim(NEW.city));
  v_city_pretty := trim(NEW.city);

  -- Someone ELSE already lives in this city → not a pioneer
  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id <> NEW.id
      AND u.city IS NOT NULL
      AND lower(trim(u.city)) = v_city_norm
  ) THEN
    RETURN NEW;
  END IF;

  -- Award the badge once; the UNIQUE(user_id, badge_id) constraint is the guard
  INSERT INTO public.user_badges (user_id, badge_id, city)
  VALUES (NEW.id, 'city_pioneer', v_city_pretty)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- Already held the badge → no double Sparks, no notification spam
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- +25 Sparks (does not touch `city`, so this UPDATE can't re-fire the trigger)
  UPDATE public.users
  SET
    sparks_balance  = COALESCE(sparks_balance, 0) + 25,
    sparks_received = COALESCE(sparks_received, 0) + 25
  WHERE id = NEW.id;

  -- In-app notification
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id,
    'badge',
    'You''re the first Bestie in ' || v_city_pretty || '! 🏛️',
    'City Pioneer badge unlocked — +25 Sparks. Your city, your rules.',
    '/' || NEW.username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger: fires on signup with a city, or whenever a user sets their city
DROP TRIGGER IF EXISTS on_city_pioneer ON public.users;
CREATE TRIGGER on_city_pioneer
  AFTER INSERT OR UPDATE OF city ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.award_city_pioneer();

-- 5. Back-fill: the earliest user of every existing non-empty city gets the
--    badge + 25 Sparks + notification. ON CONFLICT makes a re-run a no-op
--    (users who already hold the badge get nothing, so no double rewards).
WITH pioneers AS (
  SELECT DISTINCT ON (lower(trim(city)))
    id, trim(city) AS pretty_city
  FROM public.users
  WHERE city IS NOT NULL AND trim(city) <> ''
  ORDER BY lower(trim(city)), created_at ASC NULLS LAST, id
),
inserted AS (
  INSERT INTO public.user_badges (user_id, badge_id, city)
  SELECT id, 'city_pioneer', pretty_city FROM pioneers
  ON CONFLICT (user_id, badge_id) DO NOTHING
  RETURNING user_id, city
),
rewarded AS (
  UPDATE public.users u
  SET
    sparks_balance  = COALESCE(u.sparks_balance, 0) + 25,
    sparks_received = COALESCE(u.sparks_received, 0) + 25
  FROM inserted i
  WHERE u.id = i.user_id
  RETURNING u.id, u.username, i.city AS pretty_city
)
INSERT INTO public.notifications (user_id, type, title, body, link)
SELECT
  id,
  'badge',
  'You''re the first Bestie in ' || pretty_city || '! 🏛️',
  'City Pioneer badge unlocked — +25 Sparks. Your city, your rules.',
  '/' || username
FROM rewarded;
