CREATE TABLE IF NOT EXISTS public.knocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_mutual BOOLEAN DEFAULT false,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.knocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own knocks" ON public.knocks;
CREATE POLICY "users see own knocks" ON public.knocks
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "users send knocks" ON public.knocks;
CREATE POLICY "users send knocks" ON public.knocks
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "users update knocks" ON public.knocks;
CREATE POLICY "users update knocks" ON public.knocks
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "users delete own knocks" ON public.knocks;
CREATE POLICY "users delete own knocks" ON public.knocks
  FOR DELETE USING (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.send_knock(p_receiver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender UUID := auth.uid();
  v_existing UUID;
BEGIN
  IF v_sender IS NULL OR v_sender = p_receiver_id THEN RETURN 'invalid'; END IF;

  -- Check if receiver already knocked sender → mutual match
  SELECT id INTO v_existing
  FROM public.knocks
  WHERE sender_id = p_receiver_id AND receiver_id = v_sender;

  IF v_existing IS NOT NULL THEN
    UPDATE public.knocks SET is_mutual = true
    WHERE sender_id = p_receiver_id AND receiver_id = v_sender;
    INSERT INTO public.knocks (sender_id, receiver_id, is_mutual)
    VALUES (v_sender, p_receiver_id, true)
    ON CONFLICT (sender_id, receiver_id) DO UPDATE SET is_mutual = true;
    RETURN 'matched';
  END IF;

  INSERT INTO public.knocks (sender_id, receiver_id)
  VALUES (v_sender, p_receiver_id)
  ON CONFLICT (sender_id, receiver_id) DO NOTHING;

  RETURN 'sent';
END;
$$;
