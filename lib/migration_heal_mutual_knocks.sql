-- ============================================================================
-- BESTIE — heal stale mutual knocks + harden the DM gate
-- Symptom: two people knocked each other but is_mutual was never set (legacy
-- rows / out-of-band inserts), so messaging stays locked despite a real match.
--   1) Data repair: set is_mutual = true wherever reciprocal rows exist.
--   2) Hardening: can_message() now also accepts reciprocal knock rows even
--      if the flag is stale, so this class of bug can't lock chats again.
-- Safe to re-run.
-- ============================================================================

-- 1) Repair existing pairs (both directions get healed by symmetry)
UPDATE public.knocks k
SET is_mutual = true
WHERE k.is_mutual = false
  AND EXISTS (
    SELECT 1 FROM public.knocks r
    WHERE r.sender_id = k.receiver_id AND r.receiver_id = k.sender_id
  );

-- 2) Hardened gate: mutual flag OR reciprocal rows OR a real session
CREATE OR REPLACE FUNCTION public.can_message(p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- mutual knock either direction (flag)
    EXISTS (
      SELECT 1 FROM public.knocks k
      WHERE k.is_mutual = true
        AND (
          (k.sender_id = auth.uid() AND k.receiver_id = p_other) OR
          (k.sender_id = p_other     AND k.receiver_id = auth.uid())
        )
    )
    OR
    -- reciprocal knocks even if the flag is stale
    EXISTS (
      SELECT 1
      FROM public.knocks a
      JOIN public.knocks b
        ON b.sender_id = a.receiver_id AND b.receiver_id = a.sender_id
      WHERE a.sender_id = auth.uid() AND a.receiver_id = p_other
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
