CREATE TABLE IF NOT EXISTS public.session_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood_emoji TEXT,
  activity_note TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, user_id)
);

ALTER TABLE public.session_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own memories" ON public.session_memories;
CREATE POLICY "users manage own memories" ON public.session_memories
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "public read memories" ON public.session_memories;
CREATE POLICY "public read memories" ON public.session_memories
  FOR SELECT USING (true);

-- Storage bucket for memory photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-memories', 'session-memories', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "memory photos upload" ON storage.objects;
CREATE POLICY "memory photos upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-memories' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "memory photos public read" ON storage.objects;
CREATE POLICY "memory photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-memories');
