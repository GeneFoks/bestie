-- BESTIE — Referral System Migration

-- Add columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Generate referral codes for all existing users
UPDATE public.users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Auto-generate referral code on new user insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_insert_generate_referral
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- RPC: apply referral (called from frontend after signup)
-- Awards +1 bestie_score to referrer, sets referred_by on current user
CREATE OR REPLACE FUNCTION public.apply_referral(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Find referrer by code
  SELECT id INTO referrer_id FROM public.users WHERE referral_code = UPPER(p_code);

  -- Code not found
  IF referrer_id IS NULL THEN RETURN FALSE; END IF;

  -- Prevent self-referral and double-referral
  IF referrer_id = auth.uid() THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND referred_by IS NOT NULL) THEN
    RETURN FALSE;
  END IF;

  -- Mark who referred this user
  UPDATE public.users SET referred_by = referrer_id WHERE id = auth.uid();

  -- Award +1 bestie_score to referrer
  UPDATE public.users SET bestie_score = bestie_score + 1 WHERE id = referrer_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
