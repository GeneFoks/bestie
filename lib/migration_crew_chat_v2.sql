-- BESTIE — Crew Chat v2: Reactions, Pins, Replies, Mentions
-- Adds Phase 1 chat engagement features on top of migration_crew_chat.sql
-- Run in Supabase SQL editor.

-- ==========================================
-- 1. Reply-to support: each message can quote another message in the same crew
-- ==========================================
ALTER TABLE public.crew_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.crew_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crew_messages_reply_to ON public.crew_messages(reply_to_id);

-- ==========================================
-- 2. Pinned messages: captain pins announcements
-- pinned_at is the timestamp; NULL means not pinned. Multiple pins per crew
-- are allowed; the UI shows the most recently pinned at the top.
-- ==========================================
ALTER TABLE public.crew_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crew_messages_pinned ON public.crew_messages(crew_id, pinned_at DESC NULLS LAST);

-- Only the crew captain can pin / unpin
CREATE POLICY "Captain can pin or unpin messages"
  ON public.crew_messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

-- ==========================================
-- 3. Reactions: one row per (message, user, emoji). A user can have multiple
-- different emojis on the same message but only one of each emoji.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.crew_message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.crew_messages(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.users(id)         ON DELETE CASCADE NOT NULL,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_crew_message_reactions_message ON public.crew_message_reactions(message_id);

ALTER TABLE public.crew_message_reactions ENABLE ROW LEVEL SECURITY;

-- Crew members can see all reactions on messages in their crew
CREATE POLICY "Members read reactions"
  ON public.crew_message_reactions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crew_messages m
      JOIN public.crew_members cm ON cm.crew_id = m.crew_id
      WHERE m.id = message_id AND cm.user_id = auth.uid()
    )
  );

-- Crew members can react / un-react their own reactions
CREATE POLICY "Members add own reaction"
  ON public.crew_message_reactions FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_messages m
      JOIN public.crew_members cm ON cm.crew_id = m.crew_id
      WHERE m.id = message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members remove own reaction"
  ON public.crew_message_reactions FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. @mentions are computed client-side from message content; no schema needed.
-- The mention triggers an in-app + push notification via /api/notifications.
-- ==========================================
