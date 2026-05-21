-- BESTIE — Connection Graph privacy
-- Lets users hide themselves from the public Connection Graph
-- (still keeps their data intact, just excluded from /graph view).
-- Run in Supabase SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hide_from_graph BOOLEAN NOT NULL DEFAULT FALSE;
