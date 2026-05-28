-- BESTIE — Audio messages in crew chat
-- Adds media columns to crew_messages so a single row can carry text,
-- audio, or both. Audio messages set media_type = 'audio' and put the
-- public URL in media_url. content stays NOT NULL but can be empty
-- string for pure-audio messages.
-- Run in Supabase SQL editor.

ALTER TABLE public.crew_messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.crew_messages
  ADD COLUMN IF NOT EXISTS media_url      TEXT,
  ADD COLUMN IF NOT EXISTS media_type     TEXT CHECK (media_type IN ('audio')),
  ADD COLUMN IF NOT EXISTS media_duration INTEGER; -- seconds, rounded

-- A message must have *something* — text content or a media_url.
ALTER TABLE public.crew_messages
  ADD CONSTRAINT crew_messages_has_content CHECK (
    (content IS NOT NULL AND char_length(content) > 0) OR media_url IS NOT NULL
  );

-- ==========================================
-- STORAGE BUCKET: chat-audio
-- Create in Supabase Storage UI (or via SQL below) as PUBLIC.
-- Add the policies underneath.
-- ==========================================
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('chat-audio', 'chat-audio', TRUE);
--
-- CREATE POLICY "Public read chat audio"
--   ON storage.objects FOR SELECT USING (bucket_id = 'chat-audio');
--
-- CREATE POLICY "Auth users upload chat audio"
--   ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'chat-audio' AND auth.uid() IS NOT NULL
--   );
--
-- CREATE POLICY "Users delete own chat audio"
--   ON storage.objects FOR DELETE USING (
--     bucket_id = 'chat-audio' AND (storage.foldername(name))[1] = auth.uid()::text
--   );
