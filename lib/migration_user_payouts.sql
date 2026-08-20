-- ============================================================================
-- BESTIE — Host payouts for paid sessions (Stripe Connect, per user)
-- Same model as paid crews: a host connects a Stripe account and receives
-- ticket revenue minus Bestie's 10%. Any host with connected payouts can
-- price a session (no longer ambassador-only).
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_connect_id       TEXT,
  ADD COLUMN IF NOT EXISTS connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Relax the paid-event guard: allow a ticket price if the host has connected
-- payouts (or is an ambassador/admin, kept for back-compat).
CREATE OR REPLACE FUNCTION public.enforce_paid_event_rights()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.ticket_price, 0) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = NEW.host_id
        AND (connect_charges_enabled = TRUE OR is_ambassador = TRUE OR is_admin = TRUE)
    ) THEN
      RAISE EXCEPTION 'Set up payouts before charging for a session';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
