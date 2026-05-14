-- Archive flags (per-user, hides session from their view without affecting the other)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS archived_by_seeker   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_by_provider BOOLEAN DEFAULT false;

-- RPC: delete session and recalculate both users' scores
CREATE OR REPLACE FUNCTION public.delete_session(p_booking_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_booking.seeker_id != p_user_id AND v_booking.provider_id != p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  DELETE FROM public.bookings WHERE id = p_booking_id;

  PERFORM public.recalculate_bestie_score(v_booking.seeker_id);
  PERFORM public.recalculate_bestie_score(v_booking.provider_id);

  RETURN 'deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
