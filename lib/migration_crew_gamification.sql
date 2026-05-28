-- BESTIE — Phase 6: Gamification (crew streak + crew badges)
-- Both are computed views — zero new storage, derives state from existing
-- crew_events, crew_event_attendees, crew_members, event_checkins.
-- Run in Supabase SQL editor.

-- ==========================================
-- 1. CREW EVENT STREAK
-- Counts consecutive weeks ending at the current week in which the crew
-- had at least one event. Resets to 0 when there's a gap of >= 1 week.
-- ==========================================

CREATE OR REPLACE VIEW public.crew_event_streak AS
WITH RECURSIVE
last_event_per_crew AS (
  SELECT crew_id, MAX(date_trunc('week', datetime)) AS last_week
  FROM public.crew_events
  WHERE datetime <= NOW()
  GROUP BY crew_id
),
walk(crew_id, week_start, streak) AS (
  -- Anchor: last event week, only if within the last 7 days (otherwise streak is broken)
  SELECT crew_id, last_week, 1
  FROM last_event_per_crew
  WHERE date_trunc('week', NOW()) - last_week <= INTERVAL '7 days'

  UNION ALL

  -- Walk backwards week by week as long as that week had an event
  SELECT
    w.crew_id,
    w.week_start - INTERVAL '7 days',
    w.streak + 1
  FROM walk w
  WHERE EXISTS (
    SELECT 1 FROM public.crew_events e
    WHERE e.crew_id = w.crew_id
      AND date_trunc('week', e.datetime) = w.week_start - INTERVAL '7 days'
  )
)
SELECT
  c.id AS crew_id,
  COALESCE(MAX(w.streak), 0)::INTEGER AS streak_weeks
FROM public.crews c
LEFT JOIN walk w ON w.crew_id = c.id
GROUP BY c.id;

-- ==========================================
-- 2. CREW BADGES — computed achievements
-- Returns one row per (crew_id, badge_id) where the crew qualifies.
-- ==========================================

CREATE OR REPLACE VIEW public.crew_badges AS
WITH
-- ages
ages AS (
  SELECT id AS crew_id, EXTRACT(EPOCH FROM (NOW() - created_at)) / (365.25 * 24 * 60 * 60) AS years
  FROM public.crews
),
-- event counts
event_stats AS (
  SELECT crew_id, COUNT(*) AS event_count
  FROM public.crew_events
  GROUP BY crew_id
),
-- check-ins as proxy for confirmed in-person sessions inside this crew
session_stats AS (
  SELECT e.crew_id, COUNT(*) AS checkin_count
  FROM public.event_checkins c
  JOIN public.crew_events e ON e.id = c.event_id
  GROUP BY e.crew_id
),
-- member geography diversity
geo_stats AS (
  SELECT cm.crew_id, COUNT(DISTINCT NULLIF(lower(u.city), '')) AS distinct_cities
  FROM public.crew_members cm
  JOIN public.users u ON u.id = cm.user_id
  GROUP BY cm.crew_id
),
-- recent growth (members joined in last 30 days)
growth_stats AS (
  SELECT crew_id, COUNT(*) AS new_members_30d
  FROM public.crew_members
  WHERE joined_at >= NOW() - INTERVAL '30 days'
  GROUP BY crew_id
),
-- vibe diversity (how many distinct vibe_types among typed members)
vibe_stats AS (
  SELECT cm.crew_id, COUNT(DISTINCT u.vibe_type) AS distinct_vibes
  FROM public.crew_members cm
  JOIN public.users u ON u.id = cm.user_id
  WHERE u.vibe_type IS NOT NULL AND u.bestie_type_completed = TRUE
  GROUP BY cm.crew_id
)
SELECT crew_id, badge_id, label, description, icon
FROM (
  -- 🌱 OG — created 1+ year ago
  SELECT a.crew_id, 'og_crew'::TEXT AS badge_id,
         'OG Crew' AS label, '1+ year strong' AS description, 'sparkles' AS icon
  FROM ages a WHERE a.years >= 1

  UNION ALL

  -- 🏆 Veteran — 2+ years
  SELECT a.crew_id, 'veteran_crew',
         'Veteran Crew', '2+ years strong', 'trophy'
  FROM ages a WHERE a.years >= 2

  UNION ALL

  -- 🚀 Active Hosts — 10+ events created
  SELECT es.crew_id, 'active_hosts',
         'Active Hosts', '10+ events hosted', 'calendar-check'
  FROM event_stats es WHERE es.event_count >= 10

  UNION ALL

  -- 💯 Century — 100+ check-ins inside crew events
  SELECT ss.crew_id, 'century',
         '100 Meetups', '100+ confirmed check-ins', 'medal'
  FROM session_stats ss WHERE ss.checkin_count >= 100

  UNION ALL

  -- 🌍 Cross-City — members from 3+ distinct cities
  SELECT gs.crew_id, 'cross_city',
         'Cross-City', 'Members from 3+ cities', 'globe'
  FROM geo_stats gs WHERE gs.distinct_cities >= 3

  UNION ALL

  -- 🌈 Diverse — covers 3+ vibe types
  SELECT vs.crew_id, 'diverse_vibes',
         'Diverse', 'Members across 3+ vibe types', 'palette'
  FROM vibe_stats vs WHERE vs.distinct_vibes >= 3

  UNION ALL

  -- 📈 Growing — 5+ new members in last 30 days
  SELECT gs.crew_id, 'growing',
         'Growing', '5+ new members this month', 'trending-up'
  FROM growth_stats gs WHERE gs.new_members_30d >= 5

  UNION ALL

  -- 🔥 On Fire — 4+ week event streak
  SELECT s.crew_id, 'on_fire',
         'On Fire', '4+ week event streak', 'flame'
  FROM public.crew_event_streak s WHERE s.streak_weeks >= 4
) badges;

-- ==========================================
-- 3. Performance: streak view uses recursion — could be slow with many crews
-- but for our scale (<10k crews × ~20 events) it's fine. If it gets slow
-- later, materialize once a day with a scheduled function.
-- ==========================================
