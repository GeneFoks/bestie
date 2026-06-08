-- ══════════════════════════════════════════════════════════════════
-- Revoke a Spark you gave → take it back and get it returned to your wallet
--
-- revoke_spark(p_receiver_id, p_spark_type) deletes a spark the caller
-- previously gave, refunds +1 to the giver's wallet (mirror of the
-- on_spark_given deduction), and recomputes the receiver's Bestie Score.
--
-- SECURITY DEFINER so the wallet refund + score recompute run regardless
-- of RLS. The caller can only revoke their OWN sparks (giver = auth.uid()).
-- Returns 'revoked' on success, 'not_found' if there's nothing to revoke.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.revoke_spark(
  p_receiver_id UUID,
  p_spark_type  TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giver   UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_giver IS NULL THEN RETURN 'invalid'; END IF;

  DELETE FROM public.sparks
   WHERE giver_id    = v_giver
     AND receiver_id = p_receiver_id
     AND spark_type  = p_spark_type;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RETURN 'not_found';
  END IF;

  -- Mirror deduct_spark() exactly:
  --   giver    → refund wallet (+1), decrement lifetime "given" counter
  --   receiver → decrement lifetime "received" counter
  -- (all counters clamped so they never go below zero)
  UPDATE public.users
     SET sparks_balance = COALESCE(sparks_balance, 0) + v_deleted,
         sparks_given   = GREATEST(0, COALESCE(sparks_given, 0) - v_deleted)
   WHERE id = v_giver;

  UPDATE public.users
     SET sparks_received = GREATEST(0, COALESCE(sparks_received, 0) - v_deleted)
   WHERE id = p_receiver_id;

  -- Receiver's score no longer reflects this spark — recompute it.
  PERFORM public.recalculate_bestie_score(p_receiver_id);

  RETURN 'revoked';
END;
$$;
