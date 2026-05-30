-- ══════════════════════════════════════════════════════════════════
-- Bestie Score Decay for Platinum (1000 BS) users
--
-- Rule: if a user is at 1000 BS and has had NO activity for 7+ days,
--       subtract 1 BS per day until they become active again.
--       Floor is 950 — we don't punish too harshly.
--
-- "Active" = any of:
--   • completed a session (booking confirmed by both sides)
--   • sent a spark
--   • sent a direct message
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.decay_inactive_platinum_scores()
RETURNS void AS $$
DECLARE
  r RECORD;
  v_last_activity TIMESTAMPTZ;
BEGIN
  -- Find all users at 1000 BS
  FOR r IN
    SELECT id FROM public.users WHERE bestie_score >= 1000
  LOOP
    -- Find their most recent activity
    SELECT MAX(activity_time) INTO v_last_activity FROM (
      -- Last confirmed session
      SELECT MAX(COALESCE(scheduled_at, created_at)) AS activity_time
      FROM public.bookings
      WHERE (seeker_id = r.id OR provider_id = r.id)
        AND confirmed_by_seeker = true
        AND confirmed_by_provider = true

      UNION ALL

      -- Last spark sent
      SELECT MAX(created_at)
      FROM public.sparks
      WHERE giver_id = r.id

      UNION ALL

      -- Last direct message sent
      SELECT MAX(created_at)
      FROM public.direct_messages
      WHERE sender_id = r.id

    ) activity;

    -- If no activity found, treat as very old
    IF v_last_activity IS NULL THEN
      v_last_activity := NOW() - INTERVAL '30 days';
    END IF;

    -- Only decay if inactive for 7+ days
    IF v_last_activity < NOW() - INTERVAL '7 days' THEN
      UPDATE public.users
      SET bestie_score = GREATEST(950, bestie_score - 1)
      WHERE id = r.id
        AND bestie_score > 950;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Schedule via pg_cron (runs every day at 03:00 UTC) ────────────
-- pg_cron must be enabled in Supabase: Database → Extensions → pg_cron

SELECT cron.schedule(
  'decay-platinum-scores',      -- job name (unique)
  '0 3 * * *',                  -- every day at 03:00 UTC
  $$SELECT public.decay_inactive_platinum_scores();$$
);
