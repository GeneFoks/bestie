-- ============================================================================
-- BESTIE — Paid crew events (ticketed events, Connect destination charge)
--   * crew_events.ticket_price — 0/NULL = free event (plain RSVP keeps working)
--   * crew_event_tickets — one row per paid seat (written by the Stripe webhook)
--   * Money goes to the CREW's connected account (crews.stripe_connect_id);
--     Bestie keeps a 10% application fee.
--   * Safe to run more than once (idempotent).
-- ============================================================================

ALTER TABLE public.crew_events
  ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 0;

-- ── Tickets (audit of paid seats) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_event_tickets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id          UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount            NUMERIC NOT NULL,
  stripe_session_id TEXT,
  status            TEXT NOT NULL DEFAULT 'paid',   -- paid | refunded
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.crew_event_tickets ENABLE ROW LEVEL SECURITY;

-- Ticket owner or the crew's captain can read. Writes are service-role only
-- (the Stripe webhook) — no client INSERT/UPDATE/DELETE policies on purpose.
DROP POLICY IF EXISTS "crew event ticket read" ON public.crew_event_tickets;
CREATE POLICY "crew event ticket read" ON public.crew_event_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.crew_events e
      JOIN public.crews c ON c.id = e.crew_id
      WHERE e.id = event_id AND c.captain_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crew_event_tickets_event ON public.crew_event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_crew_event_tickets_user  ON public.crew_event_tickets(user_id);

-- ── Guard: can't RSVP 'going' to a paid event without a paid ticket ─────────
-- Mirrors enforce_paid_join from migration_paid_events.sql. The webhook
-- inserts with the service key (auth.uid() IS NULL) and passes through.
-- 'maybe' / 'cant_make' RSVPs stay free on any event.
CREATE OR REPLACE FUNCTION public.enforce_paid_crew_event_join()
RETURNS TRIGGER AS $$
DECLARE v_price NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;                   -- service role / system
  IF NEW.status IS DISTINCT FROM 'going' THEN RETURN NEW; END IF;  -- maybe / can't make it
  SELECT ticket_price INTO v_price FROM public.crew_events WHERE id = NEW.event_id;
  IF COALESCE(v_price, 0) > 0 AND NOT EXISTS (
    SELECT 1 FROM public.crew_event_tickets
    WHERE event_id = NEW.event_id AND user_id = NEW.user_id AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'This is a ticketed event — please get a ticket to join';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_paid_crew_event_join ON public.crew_event_attendees;
CREATE TRIGGER trg_enforce_paid_crew_event_join
  BEFORE INSERT OR UPDATE OF status ON public.crew_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_crew_event_join();
