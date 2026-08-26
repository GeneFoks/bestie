-- ============================================================================
-- BESTIE — Spark ledger
-- Every Spark movement becomes a journal row: who, how much (+/-), for what.
-- This is the bridge to any future token/rewards conversion — the history is
-- preserved from day one. Idempotent / safe to re-run.
--
-- Covered automatically:
--   * giving a Spark      → giver -1, receiver +1  (trigger on public.sparks)
--   * taking a Spark back → giver +1, receiver -1  (same trigger, DELETE)
--   * City Pioneer badge  → +25                    (award fn updated below)
-- Future features (quests, level-ups) should call log_sparks() explicitly.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_ledger (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,           -- +earned / -spent
  reason     TEXT NOT NULL,              -- human-readable, shown in history
  ref_type   TEXT,                       -- 'spark' | 'badge' | 'quest' | ...
  ref_id     UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spark_ledger_user ON public.spark_ledger(user_id, created_at DESC);

ALTER TABLE public.spark_ledger ENABLE ROW LEVEL SECURITY;

-- Your history is yours alone; writes happen only via SECURITY DEFINER fns.
DROP POLICY IF EXISTS "own ledger read" ON public.spark_ledger;
CREATE POLICY "own ledger read" ON public.spark_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Generic writer for future features (quests, level-ups, rewards)
CREATE OR REPLACE FUNCTION public.log_sparks(
  p_user_id UUID, p_delta INTEGER, p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL, p_ref_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.spark_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (p_user_id, p_delta, p_reason, p_ref_type, p_ref_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Auto-log spark give / take-back ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_spark_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_giver_name TEXT; v_recv_name TEXT; v_label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(full_name, username, 'Someone') INTO v_giver_name FROM public.users WHERE id = NEW.giver_id;
    SELECT COALESCE(full_name, username, 'Someone') INTO v_recv_name  FROM public.users WHERE id = NEW.receiver_id;
    v_label := replace(initcap(NEW.spark_type), '_', ' ');
    PERFORM public.log_sparks(NEW.giver_id,   -1, 'Gave a "' || v_label || '" Spark to ' || v_recv_name, 'spark', NEW.id);
    PERFORM public.log_sparks(NEW.receiver_id, 1, 'Received a "' || v_label || '" Spark from ' || v_giver_name, 'spark', NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_label := replace(initcap(OLD.spark_type), '_', ' ');
    PERFORM public.log_sparks(OLD.giver_id,    1, 'Took back a "' || v_label || '" Spark', 'spark', OLD.id);
    PERFORM public.log_sparks(OLD.receiver_id, -1, 'A "' || v_label || '" Spark was taken back', 'spark', OLD.id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_spark_movement ON public.sparks;
CREATE TRIGGER trg_log_spark_movement
  AFTER INSERT OR DELETE ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.log_spark_movement();

-- ── City Pioneer award now writes to the ledger too ─────────────────────────
CREATE OR REPLACE FUNCTION public.award_city_pioneer()
RETURNS TRIGGER AS $$
DECLARE
  v_city_norm   TEXT;
  v_city_pretty TEXT;
BEGIN
  IF NEW.city IS NULL OR trim(NEW.city) = '' THEN
    RETURN NEW;
  END IF;

  v_city_norm   := lower(trim(NEW.city));
  v_city_pretty := trim(NEW.city);

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id <> NEW.id
      AND u.city IS NOT NULL
      AND lower(trim(u.city)) = v_city_norm
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id, city)
  VALUES (NEW.id, 'city_pioneer', v_city_pretty)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.users
  SET
    sparks_balance  = COALESCE(sparks_balance, 0) + 25,
    sparks_received = COALESCE(sparks_received, 0) + 25
  WHERE id = NEW.id;

  PERFORM public.log_sparks(NEW.id, 25, 'City Pioneer badge — first Bestie in ' || v_city_pretty, 'badge', NULL);

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
