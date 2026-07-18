-- ============================================================================
-- BESTIE — Transfer group-session host
-- The RLS policy (host_manage_group_sessions) blocks setting host_id to
-- someone else from the client, so the handover runs as SECURITY DEFINER.
-- Rules: only the current host can transfer; the new host must be a
-- participant; they are removed from the participant list (frees a spot)
-- and the previous host takes their place as a participant.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_group_session_host(
  p_session_id UUID,
  p_new_host_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_host UUID;
BEGIN
  SELECT host_id INTO v_host FROM public.group_sessions WHERE id = p_session_id;
  IF v_host IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_host <> auth.uid() THEN
    RAISE EXCEPTION 'Only the host can transfer hosting';
  END IF;
  IF p_new_host_id = v_host THEN
    RAISE EXCEPTION 'You are already the host';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_session_participants
    WHERE session_id = p_session_id AND user_id = p_new_host_id
  ) THEN
    RAISE EXCEPTION 'The new host must be a participant of this event';
  END IF;

  UPDATE public.group_sessions SET host_id = p_new_host_id WHERE id = p_session_id;

  -- New host leaves the participant list (hosts aren't listed as participants);
  -- the previous host takes that spot so they stay in the event.
  DELETE FROM public.group_session_participants
  WHERE session_id = p_session_id AND user_id = p_new_host_id;

  INSERT INTO public.group_session_participants (session_id, user_id)
  VALUES (p_session_id, v_host)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
