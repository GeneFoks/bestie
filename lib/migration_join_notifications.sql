-- ============================================================================
-- BESTIE — notify the host when someone joins their event
-- In-app notifications (bell) via DB triggers, so every join path is covered.
-- ============================================================================

-- Group sessions: participant joined
CREATE OR REPLACE FUNCTION public.notify_session_join()
RETURNS TRIGGER AS $$
DECLARE
  v_host UUID;
  v_title TEXT;
  v_name TEXT;
BEGIN
  SELECT host_id, title INTO v_host, v_title
  FROM public.group_sessions WHERE id = NEW.session_id;

  IF v_host IS NULL OR v_host = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, username, 'Someone') INTO v_name
  FROM public.users WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_host,
    'event_join',
    v_name || ' joined your event 🎉',
    '«' || COALESCE(v_title, 'Your event') || '» has a new participant.',
    '/group-sessions/' || NEW.session_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_session_join ON public.group_session_participants;
CREATE TRIGGER trg_notify_session_join
  AFTER INSERT ON public.group_session_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_join();

-- Birthdays: guest RSVP'd "going"
CREATE OR REPLACE FUNCTION public.notify_birthday_rsvp()
RETURNS TRIGGER AS $$
DECLARE
  v_host UUID;
  v_title TEXT;
  v_slug TEXT;
  v_name TEXT;
BEGIN
  IF NEW.status <> 'going' THEN RETURN NEW; END IF;

  SELECT host_id, COALESCE(title, celebrant || '''s Birthday'), share_slug
  INTO v_host, v_title, v_slug
  FROM public.birthday_events WHERE id = NEW.event_id;

  IF v_host IS NULL OR v_host = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, username, 'Someone') INTO v_name
  FROM public.users WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_host,
    'event_join',
    v_name || ' is coming 🎂',
    v_name || ' RSVP''d to «' || v_title || '».',
    '/birthday/' || v_slug
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_birthday_rsvp ON public.birthday_guests;
CREATE TRIGGER trg_notify_birthday_rsvp
  AFTER INSERT ON public.birthday_guests
  FOR EACH ROW EXECUTE FUNCTION public.notify_birthday_rsvp();
