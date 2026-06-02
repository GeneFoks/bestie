-- Cancel / undo a knock.
-- Re-runnable. Lets a sender withdraw a knock they sent. If the pair was
-- already a mutual match, the other person's knock is downgraded back to a
-- one-way (is_mutual = false) instead of leaving a stale mutual edge that
-- would still show up on the connection graph.

CREATE OR REPLACE FUNCTION public.cancel_knock(p_receiver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender UUID := auth.uid();
  v_existing UUID;
BEGIN
  IF v_sender IS NULL OR v_sender = p_receiver_id THEN RETURN 'invalid'; END IF;

  -- The knock I sent
  SELECT id INTO v_existing
  FROM public.knocks
  WHERE sender_id = v_sender AND receiver_id = p_receiver_id;

  IF v_existing IS NULL THEN RETURN 'not_found'; END IF;

  -- Remove my knock
  DELETE FROM public.knocks
  WHERE sender_id = v_sender AND receiver_id = p_receiver_id;

  -- If they had knocked back (mutual), downgrade their side to one-way
  UPDATE public.knocks SET is_mutual = false
  WHERE sender_id = p_receiver_id AND receiver_id = v_sender;

  RETURN 'cancelled';
END;
$$;
