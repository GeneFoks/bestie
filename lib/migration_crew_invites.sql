-- BESTIE — Crew Invite Codes Migration

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate codes for existing crews
UPDATE public.crews
SET invite_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE invite_code IS NULL;

-- Auto-generate invite code on new crew insert
CREATE OR REPLACE FUNCTION public.generate_crew_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_crew_insert_generate_invite
  BEFORE INSERT ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.generate_crew_invite_code();

-- RPC: join crew via invite link (bypasses request system, works for private too)
CREATE OR REPLACE FUNCTION public.join_crew_via_invite(p_crew_id UUID, p_invite_code TEXT)
RETURNS TEXT AS $$
DECLARE
  member_count INTEGER;
  max_cap INTEGER;
BEGIN
  -- Verify invite code
  IF NOT EXISTS (SELECT 1 FROM public.crews WHERE id = p_crew_id AND invite_code = UPPER(p_invite_code)) THEN
    RETURN 'invalid_code';
  END IF;

  -- Already a member?
  IF EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = p_crew_id AND user_id = auth.uid()) THEN
    RETURN 'already_member';
  END IF;

  -- Already in another crew?
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND crew_id IS NOT NULL AND crew_id != p_crew_id) THEN
    RETURN 'in_other_crew';
  END IF;

  -- Check capacity
  SELECT COUNT(*), c.max_members INTO member_count, max_cap
  FROM public.crew_members cm
  JOIN public.crews c ON c.id = cm.crew_id
  WHERE cm.crew_id = p_crew_id
  GROUP BY c.max_members;

  IF max_cap IS NOT NULL AND member_count >= max_cap THEN
    RETURN 'full';
  END IF;

  -- Join
  INSERT INTO public.crew_members (crew_id, user_id) VALUES (p_crew_id, auth.uid())
    ON CONFLICT DO NOTHING;
  UPDATE public.users SET crew_id = p_crew_id WHERE id = auth.uid();

  -- Cancel any pending join request
  UPDATE public.crew_join_requests
    SET status = 'accepted'
    WHERE crew_id = p_crew_id AND user_id = auth.uid() AND status = 'pending';

  RETURN 'joined';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
