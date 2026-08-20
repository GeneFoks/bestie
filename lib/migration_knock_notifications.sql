-- ============================================================================
-- BESTIE — in-app notifications for knocks
-- A knock only emailed the receiver; nothing lit up the in-app bell. Now:
--   • new knock  → anonymous bell notification for the receiver
--   • match      → both sides get a "It's a match!" notification (name revealed)
-- Knocks stay anonymous until mutual, so the plain-knock notification never
-- names the sender.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_knock()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recv_name   TEXT;
  v_sender_un   TEXT;
  v_recv_un     TEXT;
BEGIN
  -- New knock (not yet mutual) → anonymous teaser for the receiver
  IF TG_OP = 'INSERT' AND COALESCE(NEW.is_mutual, FALSE) = FALSE THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.receiver_id, 'knock',
      'Someone knocked on you 👋',
      'Knock back to reveal who — if you both knock, it''s a match.',
      '/dashboard'
    );
    RETURN NEW;
  END IF;

  -- Became mutual → notify BOTH, reveal identities
  IF NEW.is_mutual = TRUE AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_mutual, FALSE) = FALSE) THEN
    SELECT COALESCE(full_name, username), username INTO v_sender_name, v_sender_un
      FROM public.users WHERE id = NEW.sender_id;
    SELECT COALESCE(full_name, username), username INTO v_recv_name, v_recv_un
      FROM public.users WHERE id = NEW.receiver_id;

    INSERT INTO public.notifications (user_id, type, title, body, link) VALUES
      (NEW.receiver_id, 'match', 'It''s a match! 🎉',
       'You and ' || COALESCE(v_sender_name, 'someone') || ' both knocked. Say hi 👋',
       '/' || COALESCE(v_sender_un, '')),
      (NEW.sender_id, 'match', 'It''s a match! 🎉',
       'You and ' || COALESCE(v_recv_name, 'someone') || ' both knocked. Say hi 👋',
       '/' || COALESCE(v_recv_un, ''));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_knock_notify ON public.knocks;
CREATE TRIGGER on_knock_notify
  AFTER INSERT OR UPDATE OF is_mutual ON public.knocks
  FOR EACH ROW EXECUTE FUNCTION public.notify_knock();
