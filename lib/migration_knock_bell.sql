-- ══════════════════════════════════════════════════════════════════
-- Knock → bell notification
--
-- Updates send_knock() so that, in the SAME transaction as writing the
-- knock row, an in-app notification is inserted for the recipient.
--
--   • Plain knock  → ANONYMOUS notice to the receiver ("Someone knocked 👀").
--                    Knocks stay anonymous: the sender is NOT revealed.
--   • Mutual match → a reveal notice to BOTH users (names shown).
--
-- Runs as SECURITY DEFINER, so the INSERT bypasses RLS (no client cookie
-- session needed). Safe to re-run — it just replaces the function.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.send_knock(p_receiver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender   UUID := auth.uid();
  v_existing UUID;
  v_sender_name     TEXT;
  v_sender_username TEXT;
  v_recv_name       TEXT;
  v_recv_username   TEXT;
BEGIN
  IF v_sender IS NULL OR v_sender = p_receiver_id THEN RETURN 'invalid'; END IF;

  -- Names for reveal-on-match notifications
  SELECT COALESCE(full_name, username, 'Someone'), username
    INTO v_sender_name, v_sender_username
    FROM public.users WHERE id = v_sender;
  SELECT COALESCE(full_name, username, 'Someone'), username
    INTO v_recv_name, v_recv_username
    FROM public.users WHERE id = p_receiver_id;

  -- Did the receiver already knock the sender? → mutual match
  SELECT id INTO v_existing
  FROM public.knocks
  WHERE sender_id = p_receiver_id AND receiver_id = v_sender;

  IF v_existing IS NOT NULL THEN
    UPDATE public.knocks SET is_mutual = true
    WHERE sender_id = p_receiver_id AND receiver_id = v_sender;
    INSERT INTO public.knocks (sender_id, receiver_id, is_mutual)
    VALUES (v_sender, p_receiver_id, true)
    ON CONFLICT (sender_id, receiver_id) DO UPDATE SET is_mutual = true;

    -- Reveal notice to BOTH sides (match is no longer anonymous)
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES
      (p_receiver_id, 'match',
       v_sender_name || ' knocked back — it''s a match! 🎉',
       'You and ' || v_sender_name || ' both knocked. Say hi or set something up.',
       '/' || v_sender_username),  -- original knocker → matcher's profile
      (v_sender, 'match',
       'It''s a match with ' || v_recv_name || ' 🎉',
       'You and ' || v_recv_name || ' both knocked. Say hi or set something up.',
       '/' || v_recv_username);    -- this user → the other person's profile

    RETURN 'matched';
  END IF;

  -- First knock — record it
  INSERT INTO public.knocks (sender_id, receiver_id)
  VALUES (v_sender, p_receiver_id)
  ON CONFLICT (sender_id, receiver_id) DO NOTHING;

  -- ANONYMOUS bell notice to the receiver. Do NOT leak the sender's identity.
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    p_receiver_id, 'knock',
    'Someone knocked on you 👀',
    'Someone wants to connect on Bestie. Knock back to reveal who it is.',
    '/dashboard'
  );

  RETURN 'sent';
END;
$$;
