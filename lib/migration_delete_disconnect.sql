-- ============================================================================
-- BESTIE — delete a past meetup with optional "cut ties"
-- delete_session_full = delete_session + (optionally) sever the connection:
--   * removes the booking and recalculates BOTH Bestie Scores (points earned
--     from this meetup disappear on both sides)
--   * with p_disconnect: also deletes the mutual knock/match and contact links
--     between the two people, so the edge vanishes from both circles/graph
-- Idempotent to re-run (CREATE OR REPLACE).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_session_full(
  p_booking_id UUID,
  p_user_id    UUID,
  p_disconnect BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
  v_booking RECORD;
  v_other   UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_booking.seeker_id != p_user_id AND v_booking.provider_id != p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  v_other := CASE WHEN v_booking.seeker_id = p_user_id
                  THEN v_booking.provider_id ELSE v_booking.seeker_id END;

  DELETE FROM public.bookings WHERE id = p_booking_id;

  IF p_disconnect THEN
    -- Match gone (both directions)
    DELETE FROM public.knocks
    WHERE (sender_id = p_user_id AND receiver_id = v_other)
       OR (sender_id = v_other  AND receiver_id = p_user_id);
    -- Contact links gone (both directions)
    DELETE FROM public.user_contacts
    WHERE (owner_id = p_user_id AND matched_user_id = v_other)
       OR (owner_id = v_other  AND matched_user_id = p_user_id);
  END IF;

  -- Points from this meetup disappear on both sides
  PERFORM public.recalculate_bestie_score(v_booking.seeker_id);
  PERFORM public.recalculate_bestie_score(v_booking.provider_id);

  RETURN CASE WHEN p_disconnect THEN 'deleted_disconnected' ELSE 'deleted' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
