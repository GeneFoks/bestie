-- ══════════════════════════════════════════════════════════════════
-- Full admin dashboard data → admin_dashboard(p_days)
--
-- Returns ONE JSON object with every metric block the dashboard renders:
--   overview KPIs · growth · activation/funnel · engagement/community ·
--   monetization · geography · traffic/behaviour · trust & safety.
--
-- Admin-only (users.is_admin). SECURITY DEFINER returns aggregates only —
-- never raw rows. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- Admin flag (no-op if migration_analytics_dashboard already added it).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_dashboard(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_since    TIMESTAMPTZ := NOW() - (GREATEST(p_days, 1) || ' days')::interval;
  v_result   JSONB;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin FROM public.users WHERE id = auth.uid();
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
           COUNT(*) FILTER (WHERE event_type='pageview') AS pvs,
           COUNT(*) FILTER (WHERE event_type='click')    AS clk
    FROM ev GROUP BY session_id
  ),
  last_pv AS (
    SELECT DISTINCT ON (session_id) session_id, path
    FROM ev WHERE event_type='pageview'
    ORDER BY session_id, created_at DESC
  )
  SELECT jsonb_build_object(
    'days', p_days,

    -- ── 1. OVERVIEW KPIs ──────────────────────────────────────────
    'overview', jsonb_build_object(
      'total_users',      (SELECT COUNT(*) FROM public.users),
      'new_today',        (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '1 day'),
      'new_7d',           (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '7 days'),
      'new_30d',          (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '30 days'),
      'plus_active',      (SELECT COUNT(*) FROM public.users WHERE subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW())),
      'verified',         (SELECT COUNT(*) FROM public.users WHERE is_verified = true),
      'dau',              (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '1 day'),
      'wau',              (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '7 days'),
      'mau',              (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '30 days')
    ),

    -- ── 2. GROWTH ─────────────────────────────────────────────────
    'signups_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', d::text, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS d, COUNT(*) c
            FROM public.users WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY 1) g
    ),
    'active_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', d::text, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at)::date AS d, COUNT(DISTINCT COALESCE(user_id::text, session_id)) c
            FROM public.analytics_events WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY 1) a
    ),

    -- ── 3. ACTIVATION / FUNNEL ────────────────────────────────────
    'funnel', jsonb_build_object(
      'signed_up',        (SELECT COUNT(*) FROM public.users),
      'profile_complete', (SELECT COUNT(*) FROM public.users
                            WHERE avatar_url IS NOT NULL AND length(trim(avatar_url))>0
                              AND bio IS NOT NULL AND length(trim(bio))>0
                              AND city IS NOT NULL AND length(trim(city))>0
                              AND energy_type IS NOT NULL),
      'verified',         (SELECT COUNT(*) FROM public.users WHERE is_verified = true),
      'did_knock',        (SELECT COUNT(DISTINCT sender_id) FROM public.knocks),
      'matched',          (SELECT COUNT(DISTINCT uid) FROM (
                              SELECT sender_id uid FROM public.knocks WHERE is_mutual = true
                              UNION SELECT receiver_id FROM public.knocks WHERE is_mutual = true) m),
      'had_session',      (SELECT COUNT(DISTINCT uid) FROM (
                              SELECT seeker_id uid FROM public.bookings WHERE confirmed_by_seeker AND confirmed_by_provider
                              UNION SELECT provider_id FROM public.bookings WHERE confirmed_by_seeker AND confirmed_by_provider) s)
    ),
    'profile_breakdown', jsonb_build_object(
      'has_avatar', (SELECT COUNT(*) FROM public.users WHERE avatar_url IS NOT NULL AND length(trim(avatar_url))>0),
      'has_bio',    (SELECT COUNT(*) FROM public.users WHERE bio IS NOT NULL AND length(trim(bio))>0),
      'has_city',   (SELECT COUNT(*) FROM public.users WHERE city IS NOT NULL AND length(trim(city))>0),
      'has_type',   (SELECT COUNT(*) FROM public.users WHERE energy_type IS NOT NULL),
      'verified',   (SELECT COUNT(*) FROM public.users WHERE is_verified = true)
    ),

    -- ── 4. ENGAGEMENT / COMMUNITY ─────────────────────────────────
    'community', jsonb_build_object(
      'knocks_sent',     (SELECT COUNT(*) FROM public.knocks),
      'matches',         (SELECT COUNT(*) FROM public.knocks WHERE is_mutual = true),
      'sparks_total',    (SELECT COUNT(*) FROM public.sparks),
      'bookings_total',  (SELECT COUNT(*) FROM public.bookings),
      'sessions_done',   (SELECT COUNT(*) FROM public.bookings WHERE confirmed_by_seeker AND confirmed_by_provider),
      'bookings_pending',(SELECT COUNT(*) FROM public.bookings WHERE status='pending'),
      'messages_total',  (SELECT COUNT(*) FROM public.direct_messages),
      'conversations',   (SELECT COUNT(DISTINCT LEAST(sender_id::text,receiver_id::text)||':'||GREATEST(sender_id::text,receiver_id::text)) FROM public.direct_messages),
      'crews_total',     (SELECT COUNT(*) FROM public.crews),
      'crew_members',    (SELECT COUNT(*) FROM public.crew_members),
      'avg_crew_size',   (SELECT COALESCE(ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM public.crews),0), 1), 0) FROM public.crew_members)
    ),
    'score_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', bucket, 'count', c) ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT CASE
                 WHEN bestie_score < 100 THEN '50–99'
                 WHEN bestie_score < 200 THEN '100–199'
                 WHEN bestie_score < 300 THEN '200–299'
                 WHEN bestie_score < 400 THEN '300–399'
                 WHEN bestie_score < 500 THEN '400–499'
                 WHEN bestie_score < 700 THEN '500–699'
                 WHEN bestie_score < 900 THEN '700–899'
                 ELSE '900–1000'
               END AS bucket,
               CASE
                 WHEN bestie_score < 100 THEN 1 WHEN bestie_score < 200 THEN 2
                 WHEN bestie_score < 300 THEN 3 WHEN bestie_score < 400 THEN 4
                 WHEN bestie_score < 500 THEN 5 WHEN bestie_score < 700 THEN 6
                 WHEN bestie_score < 900 THEN 7 ELSE 8 END AS ord,
               COUNT(*) c
        FROM public.users GROUP BY bucket, ord
      ) sd
    ),

    -- ── 5. MONETIZATION ───────────────────────────────────────────
    -- Split paid (has a Stripe subscription) from granted/comped Plus so the
    -- conversion number reflects real paying customers, not free grants.
    'monetization', jsonb_build_object(
      'plus_active',  (SELECT COUNT(*) FROM public.users WHERE subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW())),
      'plus_paid',    (SELECT COUNT(*) FROM public.users WHERE subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW()) AND stripe_subscription_id IS NOT NULL),
      'plus_granted', (SELECT COUNT(*) FROM public.users WHERE subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW()) AND stripe_subscription_id IS NULL),
      'free',         (SELECT COUNT(*) FROM public.users WHERE NOT (subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW())) OR subscription_tier IS NULL),
      'conversion_pct', (SELECT COALESCE(ROUND(
                            100.0 * COUNT(*) FILTER (WHERE subscription_tier='plus' AND (plus_expires_at IS NULL OR plus_expires_at > NOW()) AND stripe_subscription_id IS NOT NULL)
                            / NULLIF(COUNT(*),0), 1), 0) FROM public.users)
    ),

    -- ── 6. GEOGRAPHY ──────────────────────────────────────────────
    'cities', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', city, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (SELECT COALESCE(NULLIF(trim(city),''),'(none)') AS city, COUNT(*) c
            FROM public.users GROUP BY 1 ORDER BY c DESC LIMIT 15) ct
    ),

    -- ── 7. TRUST & SAFETY ─────────────────────────────────────────
    'safety', jsonb_build_object(
      'reports', (SELECT COUNT(*) FROM public.user_reports),
      'blocks',  (SELECT COUNT(*) FROM public.user_blocks),
      'avg_rating', (SELECT COALESCE(ROUND(AVG(r)::numeric, 2), 0) FROM (
                       SELECT rating_seeker r FROM public.bookings WHERE rating_seeker IS NOT NULL
                       UNION ALL SELECT rating_provider FROM public.bookings WHERE rating_provider IS NOT NULL) rr)
    ),

    -- ── 8. TRAFFIC / BEHAVIOUR (windowed by p_days) ───────────────
    'traffic', jsonb_build_object(
      'sessions',    (SELECT COUNT(*) FROM sess),
      'pageviews',   (SELECT COALESCE(SUM(pvs),0) FROM sess),
      'clicks',      (SELECT COALESCE(SUM(clk),0) FROM sess),
      'avg_seconds', (SELECT COALESCE(ROUND(AVG(secs)),0) FROM sess)
    ),
    'devices', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', dt, 'sessions', s) ORDER BY s DESC), '[]'::jsonb)
                FROM (SELECT COALESCE(device_type,'unknown') dt, COUNT(DISTINCT session_id) s FROM ev GROUP BY 1) d),
    'browsers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', br, 'sessions', s) ORDER BY s DESC), '[]'::jsonb)
                 FROM (SELECT COALESCE(browser,'unknown') br, COUNT(DISTINCT session_id) s FROM ev GROUP BY 1) b),
    'by_device_time', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', device_type, 'sessions', sessions, 'avg_seconds', avg_seconds, 'avg_pageviews', avg_pageviews) ORDER BY sessions DESC), '[]'::jsonb)
                       FROM (SELECT COALESCE(device_type,'unknown') device_type, COUNT(*) sessions, ROUND(AVG(secs)) avg_seconds, ROUND(AVG(pvs),1) avg_pageviews FROM sess GROUP BY 1) t),
    'top_pages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', path, 'views', views) ORDER BY views DESC), '[]'::jsonb)
                  FROM (SELECT path, COUNT(*) views FROM ev WHERE event_type='pageview' GROUP BY path ORDER BY views DESC LIMIT 15) p),
    'exit_pages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', path, 'sessions', s) ORDER BY s DESC), '[]'::jsonb)
                   FROM (SELECT path, COUNT(*) s FROM last_pv GROUP BY path ORDER BY s DESC LIMIT 15) e),
    'top_clicks', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', element, 'clicks', c) ORDER BY c DESC), '[]'::jsonb)
                   FROM (SELECT element, COUNT(*) c FROM ev WHERE event_type='click' GROUP BY element ORDER BY c DESC LIMIT 15) cl)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard(INTEGER) TO authenticated;
