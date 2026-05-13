-- BESTIE — Direct Messages Migration
-- Run in Supabase SQL Editor

CREATE TABLE public.direct_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Both parties can read the conversation
CREATE POLICY "Parties can read their messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Any authenticated user can send a message as themselves
CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Receiver can mark messages as read
CREATE POLICY "Receiver can mark as read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_dm_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_dm_created ON public.direct_messages(created_at);
