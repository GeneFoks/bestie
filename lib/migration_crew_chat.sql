-- BESTIE — Crew Chat & Avatar Migration
-- Run this in Supabase SQL editor

-- ==========================================
-- CREW MESSAGES
-- ==========================================

CREATE TABLE public.crew_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crew_messages ENABLE ROW LEVEL SECURITY;

-- Only crew members can read messages
CREATE POLICY "Crew members can read messages"
  ON public.crew_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_id AND cm.user_id = auth.uid()
    )
  );

-- Only crew members can send messages
CREATE POLICY "Crew members can send messages"
  ON public.crew_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_id AND cm.user_id = auth.uid()
    )
  );

CREATE INDEX idx_crew_messages_crew ON public.crew_messages(crew_id, created_at DESC);

-- ==========================================
-- STORAGE BUCKET FOR CREW AVATARS
-- ==========================================
-- Run this separately in Supabase Storage settings or via API:
-- Create a public bucket named "crew-avatars"
-- Or run:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('crew-avatars', 'crew-avatars', true);

-- Storage policy: anyone can read, authenticated users can upload
-- CREATE POLICY "Public read crew avatars"
--   ON storage.objects FOR SELECT USING (bucket_id = 'crew-avatars');
-- CREATE POLICY "Authenticated users can upload crew avatars"
--   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'crew-avatars' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "Users can update own crew avatars"
--   ON storage.objects FOR UPDATE USING (bucket_id = 'crew-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own crew avatars"
--   ON storage.objects FOR DELETE USING (bucket_id = 'crew-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
