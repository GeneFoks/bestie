-- ══════════════════════════════════════════════════════════════════
-- First-party product analytics → analytics_events
--
-- One row per tracked event. The client (lib/analytics.ts) writes:
--   • 'pageview'    on every route change
--   • 'click'       on any button / link / [data-track] element
--   • 'session_end' (best-effort) when the tab is hidden/closed
--
-- From these rows we derive, in plain SQL:
--   • device / browser / OS mix      (device_type, browser, os)
--   • time on site                   (max - min created_at per session_id)
--   • what people click              (event_type='click', element)
--   • where they drop off            (last pageview path per session_id)
--
-- SECURITY: anyone (anon or logged-in) may INSERT their own events, but
-- NOBODY can SELECT through the API — there is no SELECT policy, so only
-- the service role (Supabase SQL Editor / dashboard) can read the data.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id  TEXT        NOT NULL,
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,   -- 'pageview' | 'click' | 'session_end'
  path        TEXT,                   -- current route, e.g. '/browse'
  element     TEXT,                   -- what was clicked (label/aria/text/tag)
  href        TEXT,                   -- link target, if the click was on a link
  device_type TEXT,                   -- 'mobile' | 'tablet' | 'desktop'
  browser     TEXT,
  os          TEXT,
  referrer    TEXT,                   -- previous in-app path, or external referrer
  screen_w    INTEGER,
  metadata    JSONB
);

-- Indexes for the common analysis cuts.
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type    ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_path    ON public.analytics_events (path);
CREATE INDEX IF NOT EXISTS idx_analytics_user    ON public.analytics_events (user_id);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow logging. A logged-in user may only attribute events to themselves;
-- anonymous visitors write user_id = NULL.
DROP POLICY IF EXISTS "log analytics events" ON public.analytics_events;
CREATE POLICY "log analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies → the API can't read or change rows.
-- Make sure the API roles can INSERT (but nothing else).
GRANT INSERT ON public.analytics_events TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════
-- ANALYSIS QUERIES — run these in the SQL Editor whenever you want a read.
-- (They are comments so this migration only creates the schema. Copy a
--  block, remove the leading "-- ", and Run.)
-- ══════════════════════════════════════════════════════════════════
--
-- 1) Device / browser / OS mix (last 30 days), by sessions:
-- SELECT device_type, browser, os, COUNT(DISTINCT session_id) AS sessions
-- FROM public.analytics_events
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY device_type, browser, os
-- ORDER BY sessions DESC;
--
-- 2) Time on site per session + pages viewed (last 30 days):
-- SELECT session_id,
--        MAX(device_type) AS device,
--        MIN(created_at)  AS started,
--        ROUND(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))))::int AS seconds_on_site,
--        COUNT(*) FILTER (WHERE event_type = 'pageview') AS pageviews,
--        COUNT(*) FILTER (WHERE event_type = 'click')    AS clicks
-- FROM public.analytics_events
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY session_id
-- ORDER BY seconds_on_site DESC;
--
-- 3) Average time on site + average pages, by device:
-- WITH s AS (
--   SELECT session_id, MAX(device_type) AS device,
--          EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS secs,
--          COUNT(*) FILTER (WHERE event_type='pageview') AS pvs
--   FROM public.analytics_events
--   WHERE created_at > NOW() - INTERVAL '30 days'
--   GROUP BY session_id
-- )
-- SELECT device,
--        COUNT(*)                       AS sessions,
--        ROUND(AVG(secs))::int          AS avg_seconds,
--        ROUND(AVG(pvs), 1)             AS avg_pageviews
-- FROM s GROUP BY device ORDER BY sessions DESC;
--
-- 4) Most clicked things:
-- SELECT element, COUNT(*) AS clicks
-- FROM public.analytics_events
-- WHERE event_type = 'click' AND created_at > NOW() - INTERVAL '30 days'
-- GROUP BY element ORDER BY clicks DESC LIMIT 30;
--
-- 5) Exit pages — the LAST page of each session (where people leave):
-- WITH last_pv AS (
--   SELECT DISTINCT ON (session_id) session_id, path
--   FROM public.analytics_events
--   WHERE event_type = 'pageview' AND created_at > NOW() - INTERVAL '30 days'
--   ORDER BY session_id, created_at DESC
-- )
-- SELECT path AS exit_page, COUNT(*) AS sessions_ended_here
-- FROM last_pv GROUP BY path ORDER BY sessions_ended_here DESC LIMIT 30;
--
-- 6) Most visited pages:
-- SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions
-- FROM public.analytics_events
-- WHERE event_type = 'pageview' AND created_at > NOW() - INTERVAL '30 days'
-- GROUP BY path ORDER BY views DESC LIMIT 30;
-- ══════════════════════════════════════════════════════════════════
