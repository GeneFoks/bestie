-- ══════════════════════════════════════════════════════════════════
-- Nightly Bestie Score recalculation (pg_cron)
--
-- Bestie Score is recomputed from scratch only when something changes for
-- that specific user. But a score also depends on OTHER people (spark/rater
-- weights) and on time (weekly streak), so it can go stale between events
-- and then "jump" the next time a trigger fires.
--
-- Fix: recompute everyone once a night so displayed scores are always fresh.
-- Safe to re-run (the job is replaced, not duplicated).
-- ══════════════════════════════════════════════════════════════════

-- One callable that refreshes every user's score.
CREATE OR REPLACE FUNCTION public.recalculate_all_bestie_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalculate_bestie_score(r.id);
  END LOOP;
END;
$$;

-- pg_cron lives in Supabase; enable it (no-op if already on).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Replace any previous copy of the job so re-running doesn't stack duplicates.
DO $$
BEGIN
  PERFORM cron.unschedule('nightly-bestie-score');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job didn't exist yet
END;
$$;

-- Run every day at 09:00 UTC (~3–4am Central, low traffic).
SELECT cron.schedule(
  'nightly-bestie-score',
  '0 9 * * *',
  $job$ SELECT public.recalculate_all_bestie_scores(); $job$
);

-- Refresh everyone right now too, so scores are correct immediately.
SELECT public.recalculate_all_bestie_scores();
