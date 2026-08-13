-- ============================================================================
-- BESTIE — Recurring group sessions
-- Create once, repeats automatically (e.g. pickleball every Sunday).
-- A "series" is a set of occurrences sharing series_id (= the first row's id).
-- On create we materialize the next ~12 occurrences; a cron tops the series up
-- so it never runs out. recurrence: none | weekly | biweekly | monthly.
-- ============================================================================

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS recurrence  TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS series_id   UUID;

CREATE INDEX IF NOT EXISTS idx_group_sessions_series ON public.group_sessions(series_id);
