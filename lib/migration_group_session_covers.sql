-- BESTIE — Cover image for group sessions
-- Lets the host upload a full-width cover image for the session card.
-- Run in Supabase SQL Editor.

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- ==========================================
-- STORAGE BUCKET: group-session-covers
-- Create as PUBLIC in Supabase Storage UI (or via SQL below).
-- ==========================================
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('group-session-covers', 'group-session-covers', TRUE);
--
-- CREATE POLICY "Public read group session covers"
--   ON storage.objects FOR SELECT USING (bucket_id = 'group-session-covers');
--
-- CREATE POLICY "Auth users upload group session covers"
--   ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'group-session-covers' AND auth.uid() IS NOT NULL
--   );
--
-- CREATE POLICY "Users update own group session covers"
--   ON storage.objects FOR UPDATE USING (
--     bucket_id = 'group-session-covers' AND (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- CREATE POLICY "Users delete own group session covers"
--   ON storage.objects FOR DELETE USING (
--     bucket_id = 'group-session-covers' AND (storage.foldername(name))[1] = auth.uid()::text
--   );
