-- ══════════════════════════════════════════════════════════════════
-- Knock Notifications
-- 1. notify_mutual_connections_on_going_to()
--    When a user posts a Going To event, insert in-app notifications
--    for everyone who has a mutual knock with them.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_mutual_connections_on_going_to()
RETURNS TRIGGER AS $$
DECLARE
  v_poster_name TEXT;
  v_activity    TEXT;
BEGIN
  -- Get poster's name
  SELECT COALESCE(full_name, username, 'Someone') INTO v_poster_name
  FROM public.users WHERE id = NEW.user_id;

  v_activity := COALESCE(NEW.activity_type, 'something');

  -- Insert a notification for every mutual knock connection
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT
    CASE
      WHEN k.sender_id = NEW.user_id THEN k.receiver_id
      ELSE k.sender_id
    END,
    'going_to',
    v_poster_name || ' is going out 👋',
    v_poster_name || ' posted a Going To: ' || v_activity ||
      CASE WHEN NEW.location IS NOT NULL AND NEW.location != ''
           THEN ' at ' || NEW.location ELSE '' END,
    '/going-to'
  FROM public.knocks k
  WHERE (k.sender_id = NEW.user_id OR k.receiver_id = NEW.user_id)
    AND k.is_mutual = true
    AND k.sender_id = NEW.user_id;  -- one row per pair where poster is sender

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_going_to_posted ON public.going_to;
CREATE TRIGGER on_going_to_posted
  AFTER INSERT ON public.going_to
  FOR EACH ROW EXECUTE FUNCTION public.notify_mutual_connections_on_going_to();
