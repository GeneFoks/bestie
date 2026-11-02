-- ============================================================================
-- @TowerCrewBot («Вышки в США») — teams, profiles and reviews
--
-- tg_people         everyone the bot has seen (from-users of handled updates and
--                   people whose message was replied to with /review, /profile).
--                   Used to resolve @username → telegram id. last_group_cmd_at =
--                   anti-flood for group commands (one per 15 s).
-- tg_teams          teams (/crew create). Name unique per group, case-insensitive
--                   (name_key = lower(trim(collapsed spaces)), NFKC, no invisible
--                   characters — done in lib/tower-teams.ts).
-- tg_team_members   one team per person (UNIQUE telegram_user_id). The leader is
--                   the row with role = 'leader'.
-- tg_team_requests  /crew join = a request the leader accepts / declines.
--                   status 'kicked' / 'declined' blocks new requests to that
--                   team for 7 days (checked in lib/tower-teams.ts).
-- tg_reviews        one review per author → target (an edit replaces it).
--                   hidden_at set by an admin → excluded from lists and ratings.
--                   notified_at = last DM to the reviewed person.
--                   group_chat_id / group_message_id = the bot's latest
--                   confirmation in the group (edited when the review is hidden).
-- tg_bot_state      multi-step conversations in the bot (expire after 15 min).
--
-- tg_team_leave()          leave + leader handover in one locked transaction.
-- tg_reviews_daily_limit   max 10 new reviews per author per 24 h (trigger).
--
-- Nothing here is tied to subscriptions: teams and reviews never kick, ban,
-- restrict or promote anyone in the Telegram group.
--
-- All tables: RLS on, no policies → only the service role (server) can read
-- or write. Functions: service role only. Safe to re-run (also on top of an
-- earlier version of this file).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tg_people (
  telegram_user_id BIGINT PRIMARY KEY,
  username         TEXT,
  first_name       TEXT,
  last_name        TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tg_people ADD COLUMN IF NOT EXISTS last_group_cmd_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS tg_people_username_idx
  ON public.tg_people (lower(username));

CREATE TABLE IF NOT EXISTS public.tg_teams (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id            BIGINT NOT NULL,
  name               TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  name_key           TEXT NOT NULL,
  description        TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  leader_telegram_id BIGINT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, name_key)
);

CREATE TABLE IF NOT EXISTS public.tg_team_members (
  team_id          UUID NOT NULL REFERENCES public.tg_teams(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, telegram_user_id),
  UNIQUE (telegram_user_id)
);

CREATE TABLE IF NOT EXISTS public.tg_team_requests (
  team_id          UUID NOT NULL REFERENCES public.tg_teams(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'kicked', 'cancelled')),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, telegram_user_id)
);
CREATE INDEX IF NOT EXISTS tg_team_requests_user_idx
  ON public.tg_team_requests (telegram_user_id, status);

CREATE TABLE IF NOT EXISTS public.tg_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id            BIGINT NOT NULL,
  target_telegram_id BIGINT NOT NULL,
  author_telegram_id BIGINT NOT NULL,
  rating             SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text               TEXT CHECK (char_length(text) <= 1000),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden_at          TIMESTAMPTZ,
  UNIQUE (target_telegram_id, author_telegram_id),
  CHECK (target_telegram_id <> author_telegram_id)
);
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS notified_at      TIMESTAMPTZ;
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS group_chat_id    BIGINT;
ALTER TABLE public.tg_reviews ADD COLUMN IF NOT EXISTS group_message_id BIGINT;
CREATE INDEX IF NOT EXISTS tg_reviews_target_idx
  ON public.tg_reviews (target_telegram_id);
CREATE INDEX IF NOT EXISTS tg_reviews_author_created_idx
  ON public.tg_reviews (author_telegram_id, created_at);
CREATE INDEX IF NOT EXISTS tg_reviews_author_updated_idx
  ON public.tg_reviews (author_telegram_id, updated_at);
CREATE INDEX IF NOT EXISTS tg_reviews_updated_idx
  ON public.tg_reviews (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.tg_bot_state (
  telegram_user_id BIGINT PRIMARY KEY,
  state            TEXT,
  data             JSONB,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tg_people        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_bot_state     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tg_people, public.tg_teams, public.tg_team_members,
              public.tg_team_requests, public.tg_reviews, public.tg_bot_state
  FROM anon, authenticated;

-- ── Leave a team (+ leader handover) ────────────────────────────────────────
-- Locks the team row, so leaves / handovers / joins of one team run one at a
-- time. After the leave: no members → the team is deleted; no leader → the
-- earliest-joined member becomes leader. tg_teams.leader_telegram_id is kept
-- in sync. Returns {left, team_id, team_name, was_leader, deleted, leader,
-- new_leader}.
CREATE OR REPLACE FUNCTION public.tg_team_leave(p_uid BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_team   UUID;
  v_name   TEXT;
  v_role   TEXT;
  v_leader BIGINT;
  v_heir   BIGINT;
  v_new    BIGINT;
  v_try    INT := 0;
BEGIN
  SELECT m.team_id INTO v_team
    FROM public.tg_team_members m
   WHERE m.telegram_user_id = p_uid;
  IF v_team IS NULL THEN
    RETURN jsonb_build_object('left', false);
  END IF;

  SELECT t.name INTO v_name
    FROM public.tg_teams t
   WHERE t.id = v_team
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('left', false);
  END IF;

  DELETE FROM public.tg_team_members m
   WHERE m.team_id = v_team AND m.telegram_user_id = p_uid
  RETURNING m.role INTO v_role;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('left', false);
  END IF;

  LOOP
    SELECT m.telegram_user_id INTO v_leader
      FROM public.tg_team_members m
     WHERE m.team_id = v_team AND m.role = 'leader'
     ORDER BY m.joined_at, m.telegram_user_id
     LIMIT 1;
    EXIT WHEN v_leader IS NOT NULL;

    SELECT m.telegram_user_id INTO v_heir
      FROM public.tg_team_members m
     WHERE m.team_id = v_team
     ORDER BY m.joined_at, m.telegram_user_id
     LIMIT 1;
    IF v_heir IS NULL THEN
      DELETE FROM public.tg_teams t WHERE t.id = v_team;
      RETURN jsonb_build_object(
        'left', true, 'team_id', v_team, 'team_name', v_name,
        'was_leader', v_role = 'leader', 'deleted', true);
    END IF;

    UPDATE public.tg_team_members m
       SET role = 'leader'
     WHERE m.team_id = v_team AND m.telegram_user_id = v_heir;
    IF FOUND THEN
      v_new := v_heir;
    END IF;

    v_try := v_try + 1;
    IF v_try > 5 THEN
      RAISE EXCEPTION 'tg_team_leave: no heir for team %', v_team;
    END IF;
  END LOOP;

  UPDATE public.tg_teams t
     SET leader_telegram_id = v_leader
   WHERE t.id = v_team AND t.leader_telegram_id IS DISTINCT FROM v_leader;

  RETURN jsonb_build_object(
    'left', true, 'team_id', v_team, 'team_name', v_name,
    'was_leader', v_role = 'leader', 'deleted', false,
    'leader', v_leader, 'new_leader', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.tg_team_leave(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_team_leave(BIGINT) TO service_role;

-- ── Max 10 new reviews per author per 24 h ──────────────────────────────────
-- Parallel inserts by one author wait on the advisory lock, so the count is
-- exact. The bot maps the error (P0001 'tg_reviews_daily_limit') to its
-- «Лимит — 10 новых отзывов в сутки» text.
CREATE OR REPLACE FUNCTION public.tg_reviews_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('tg_reviews_author:' || NEW.author_telegram_id::text, 0));
  IF (SELECT count(*)
        FROM public.tg_reviews r
       WHERE r.author_telegram_id = NEW.author_telegram_id
         AND r.created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'tg_reviews_daily_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_reviews_daily_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tg_reviews_daily_limit ON public.tg_reviews;
CREATE TRIGGER tg_reviews_daily_limit
  BEFORE INSERT ON public.tg_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_daily_limit();

-- PostgREST: pick up the new columns / function right away.
NOTIFY pgrst, 'reload schema';
