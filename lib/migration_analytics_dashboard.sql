-- ══════════════════════════════════════════════════════════════════
-- Analytics dashboard access → admin-only aggregates
--
-- The analytics_events table is insert-only over the API (no SELECT
-- policy). To power an in-app dashboard WITHOUT exposing raw rows, we add
-- a SECURITY DEFINER function that returns only aggregated numbers, and
-- only to admins.
--
-- Admin = public.users.is_admin = true. Grant yourself with the UPDATE at
-- the bottom of this file. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- 1) Admin flag on users.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2) Aggregated analytics for the dashboard. Returns one JSON object with
--    every section the dashboard renders. Admin-only.
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_since    TIMESTAMPTZ := NOW() - (GREATEST(p_days, 1) || ' days')::interval;
  v_result   JSONB;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM public.users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  WITH ev AS (
    SELECT * FROM public.analytics_events WHERE created_at > v_since
  ),
  sess AS (
    SELECT session_id,
           MAX(device_type) AS device_type,
           EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS secs,
           COUNT(*) FILTER (WHERE event_type = 'pageview') AS pvs,
           COUNT(*) FILTER (WHERE event_type = 'click')    AS clk
    FROM ev GROUP BY session_id
  ),
  last_pv AS (
    SELECT DISTINCT ON (session_id) session_id, path
    FROM ev WHERE event_type = 'pageview'
    ORDER BY session_id, created_at DESC
  )
  SELECT jsonb_build_object(
    'days', p_days,
    'totals', jsonb_build_object(
      'sessions',   (SELECT COUNT(*) FROM sess),
      'pageviews',  (SELECT COALESCE(SUM(pvs), 0) FROM sess),
      'clicks',     (SELECT COALESCE(SUM(clk), 0) FROM sess),
      'avg_seconds',(SELECT COALESCE(ROUND(AVG(secs)), 0) FROM sess)
    ),
    'devices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', device_type, 'sessions', sessions) ORDER BY sessions DESC), '[]'::jsonb)
      FROM (SELECT COALESCE(device_type,'unknown') AS device_type, COUNT(DISTINCT session_id) AS sessions
            FROM ev GROUP BY 1) d
    ),
    'browsers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', browser, 'sessions', sessions) ORDER BY sessions DESC), '[]'::jsonb)
      FROM (SELECT COALESCE(browser,'unknown') AS browser, COUNT(DISTINCT session_id) AS sessions
            FROM ev GROUP BY 1) b
    ),
    'by_device_time', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'label', device_type, 'sessions', sessions,
               'avg_seconds', avg_seconds, 'avg_pageviews', avg_pageviews) ORDER BY sessions DESC), '[]'::jsonb)
      FROM (SELECT COALESCE(device_type,'unknown') AS device_type,
                   COUNT(*) AS sessions,
                   ROUND(AVG(secs)) AS avg_seconds,
                   ROUND(AVG(pvs), 1) AS avg_pageviews
            FROM sess GROUP BY 1) t
    ),
    'top_pages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', path, 'views', views) ORDER BY views DESC), '[]'::jsonb)
      FROM (SELECT path, COUNT(*) AS views FROM ev WHERE event_type='pageview'
            GROUP BY path ORDER BY views DESC LIMIT 15) p
    ),
    'top_clicks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', element, 'clicks', clicks) ORDER BY clicks DESC), '[]'::jsonb)
      FROM (SELECT element, COUNT(*) AS clicks FROM ev WHERE event_type='click'
            GROUP BY element ORDER BY clicks DESC LIMIT 15) c
    ),
    'exit_pages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', path, 'sessions', sessions) ORDER BY sessions DESC), '[]'::jsonb)
      FROM (SELECT path, COUNT(*) AS sessions FROM last_pv
            GROUP BY path ORDER BY sessions DESC LIMIT 15) e
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_analytics(INTEGER) TO authenticated;

-- ══════════════════════════════════════════════════════════════════
-- 3) GRANT YOURSELF ADMIN — edit the WHERE clause, then run this line.
--    Use your username (or email if your users table has one).
-- ══════════════════════════════════════════════════════════════════
-- UPDATE public.users SET is_admin = true WHERE username = 'YOUR_USERNAME';
