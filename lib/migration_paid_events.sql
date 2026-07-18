-- ============================================================================
-- BESTIE — Paid events (Phase 1: ambassadors only, platform-collected)
--   * users.is_ambassador — who may set a ticket price on their events
--   * group_sessions.ticket_price — 0/NULL = free event
--   * event_tickets — one row per paid seat (written by the Stripe webhook)
--   * ambassador_applications — "become an ambassador" requests + admin RPCs
--   * Free joins keep working via join_group_session; PAID joins are inserted
--     by the webhook with the service key. The capacity trigger still guards.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 0;

-- ── Tickets (audit of paid seats) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID REFERENCES public.group_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount            NUMERIC NOT NULL,
  stripe_session_id TEXT,
  status            TEXT NOT NULL DEFAULT 'paid',   -- paid | refunded
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets read" ON public.event_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.group_sessions s
               WHERE s.id = session_id AND s.host_id = auth.uid())
  );
-- writes: service role only (webhook)

CREATE INDEX IF NOT EXISTS idx_event_tickets_session ON public.event_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_user    ON public.event_tickets(user_id);

-- ── Ambassador applications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apply self" ON public.ambassador_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read own application" ON public.ambassador_applications
  FOR SELECT USING (auth.uid() = user_id);

-- ── Admin RPCs (reuse assert_admin from the moderation migration) ──────────
CREATE OR REPLACE FUNCTION public.admin_list_ambassador_applications()
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT a.id, a.message, a.status, a.created_at,
      json_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username,
                        'avatar_url', u.avatar_url, 'city', u.city,
                        'bestie_score', u.bestie_score, 'is_ambassador', u.is_ambassador) AS applicant
    FROM public.ambassador_applications a
    LEFT JOIN public.users u ON u.id = a.user_id
  ) r;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_decide_ambassador(p_application_id UUID, p_approve BOOLEAN)
RETURNS VOID AS $$
DECLARE v_user UUID;
BEGIN
  PERFORM public.assert_admin();
  SELECT user_id INTO v_user FROM public.ambassador_applications WHERE id = p_application_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.ambassador_applications
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END
  WHERE id = p_application_id;

  PERFORM set_config('bestie.system', 'on', true);
  UPDATE public.users SET is_ambassador = p_approve WHERE id = v_user;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_user, 'ambassador',
    CASE WHEN p_approve THEN 'You''re an Ambassador now 👑' ELSE 'Ambassador application update' END,
    CASE WHEN p_approve
      THEN 'Welcome aboard! You can now host paid events with ticket sales.'
      ELSE 'Thanks for applying — we can''t bring you on just yet. Keep hosting and try again soon!'
    END,
    CASE WHEN p_approve THEN '/group-sessions/new' ELSE '/events' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify admins when someone applies
CREATE OR REPLACE FUNCTION public.notify_ambassador_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT id, 'ambassador', 'New ambassador application',
         (SELECT COALESCE(full_name, username) FROM public.users WHERE id = NEW.user_id) || ' wants to become an ambassador.',
         '/admin/ambassadors'
  FROM public.users WHERE is_admin = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_ambassador_application ON public.ambassador_applications;
CREATE TRIGGER trg_notify_ambassador_application
  AFTER INSERT ON public.ambassador_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_ambassador_application();

-- ── Guard: only ambassadors (or admins) can set a ticket price ─────────────
CREATE OR REPLACE FUNCTION public.enforce_paid_event_rights()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.ticket_price, 0) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = NEW.host_id AND (is_ambassador = TRUE OR is_admin = TRUE)
    ) THEN
      RAISE EXCEPTION 'Paid events are available to Bestie Ambassadors';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_paid_event ON public.group_sessions;
CREATE TRIGGER trg_enforce_paid_event
  BEFORE INSERT OR UPDATE OF ticket_price ON public.group_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_event_rights();

-- ── Guard: can't self-join a paid event without paying ─────────────────────
-- (the webhook inserts with the service key and bypasses this)
CREATE OR REPLACE FUNCTION public.enforce_paid_join()
RETURNS TRIGGER AS $$
DECLARE v_price NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- service role / system
  SELECT ticket_price INTO v_price FROM public.group_sessions WHERE id = NEW.session_id;
  IF COALESCE(v_price, 0) > 0 AND NOT EXISTS (
    SELECT 1 FROM public.event_tickets
    WHERE session_id = NEW.session_id AND user_id = NEW.user_id AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'This is a ticketed event — please purchase a ticket to join';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_paid_join ON public.group_session_participants;
CREATE TRIGGER trg_enforce_paid_join
  BEFORE INSERT ON public.group_session_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_join();
