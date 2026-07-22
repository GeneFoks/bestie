-- ============================================================================
-- BESTIE — Community verification
-- Makes the "Verified" badge earnable and honest: a user becomes verified
-- after 3 confirmed meetups with 3 DIFFERENT people. No cost, no manual step,
-- can't be faked by one fake partner. Runs whenever a booking is confirmed.
-- (Admins can still set is_verified manually; this only ever grants, never revokes.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_community_verified(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_partners INTEGER;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(DISTINCT partner) INTO v_partners
  FROM (
    SELECT CASE WHEN seeker_id = p_user_id THEN provider_id ELSE seeker_id END AS partner
    FROM public.bookings
    WHERE (seeker_id = p_user_id OR provider_id = p_user_id)
      AND confirmed_by_seeker = TRUE
      AND confirmed_by_provider = TRUE
  ) q
  WHERE partner IS NOT NULL AND partner <> p_user_id;

  IF v_partners >= 3 THEN
    PERFORM set_config('bestie.system', 'on', true);
    UPDATE public.users SET is_verified = TRUE
      WHERE id = p_user_id AND COALESCE(is_verified, FALSE) = FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trg_community_verify()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed_by_seeker = TRUE AND NEW.confirmed_by_provider = TRUE THEN
    PERFORM public.check_community_verified(NEW.seeker_id);
    PERFORM public.check_community_verified(NEW.provider_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_verify ON public.bookings;
CREATE TRIGGER on_booking_verify
  AFTER INSERT OR UPDATE OF confirmed_by_seeker, confirmed_by_provider ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_verify();

-- Backfill: verify everyone who already qualifies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.check_community_verified(r.id);
  END LOOP;
END;
$$;
