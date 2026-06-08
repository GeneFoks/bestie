-- ══════════════════════════════════════════════════════════════════
-- Messaging gate → DMs only after a mutual knock OR a real session
--
-- A user may send a direct_message to another user ONLY IF:
--   • they have a mutual knock (knocks.is_mutual = true, either direction), OR
--   • they share a booking/session that actually happened or was agreed
--     (status accepted or completed, either as seeker or provider).
--
-- Enforced at the DB with an RLS WITH CHECK on INSERT, so the gate holds
-- even if the UI is bypassed. A SECURITY DEFINER helper does the lookup so
-- the check can read knocks/bookings regardless of those tables' own RLS.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- Helper: can current auth.uid() message p_other?
CREATE OR REPLACE FUNCTION public.can_message(p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- mutual knock either direction
    EXISTS (
      SELECT 1 FROM public.knocks k
      WHERE k.is_mutual = true
        AND (
          (k.sender_id = auth.uid() AND k.receiver_id = p_other) OR
          (k.sender_id = p_other     AND k.receiver_id = auth.uid())
        )
    )
    OR
    -- a real session together (accepted or completed), either role
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status IN ('accepted', 'completed')
        AND (
          (b.seeker_id = auth.uid() AND b.provider_id = p_other) OR
          (b.seeker_id = p_other     AND b.provider_id = auth.uid())
        )
    );
$$;

-- Replace the open INSERT policy with the gated one.
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages if matched or session" ON public.direct_messages;

CREATE POLICY "Users can send messages if matched or session"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.can_message(receiver_id)
  );
