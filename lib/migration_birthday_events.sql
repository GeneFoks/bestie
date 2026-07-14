-- ============================================================================
-- BESTIE — Birthday Events
-- A shareable birthday page: invite by link, RSVP, shared photo wall,
-- gift wishlist (with Amazon/any-store link previews & "claim" so no doubles),
-- and an internal guest chat.
--
-- Storage: reuses the existing public "event-photos" bucket for cover + wall.
-- Run this whole file in the Supabase SQL editor.
-- ============================================================================

-- ── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.birthday_events (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  celebrant     TEXT NOT NULL,                          -- whose birthday
  title         TEXT,                                   -- optional custom title
  description   TEXT,
  event_date    TIMESTAMPTZ NOT NULL,
  location      TEXT,
  location_url  TEXT,                                   -- google maps / any link
  cover_image   TEXT,
  share_slug    TEXT UNIQUE NOT NULL
                  DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  allow_photos  BOOLEAN DEFAULT TRUE,
  allow_wishlist BOOLEAN DEFAULT TRUE,
  allow_chat    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.birthday_guests (
  event_id  UUID REFERENCES public.birthday_events(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status    TEXT NOT NULL DEFAULT 'going',              -- going | maybe | cant
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.birthday_wishlist (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES public.birthday_events(id) ON DELETE CASCADE NOT NULL,
  added_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  url        TEXT,
  image_url  TEXT,
  price      TEXT,
  claimed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.birthday_photos (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES public.birthday_events(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  photo_url  TEXT NOT NULL,
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.birthday_messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES public.birthday_events(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Birthday pages are invite-by-link, so SELECT is public. Writes require auth.

ALTER TABLE public.birthday_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_guests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_messages ENABLE ROW LEVEL SECURITY;

-- events
CREATE POLICY "birthday events public read"
  ON public.birthday_events FOR SELECT USING (TRUE);
CREATE POLICY "birthday host can create"
  ON public.birthday_events FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "birthday host can update"
  ON public.birthday_events FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "birthday host can delete"
  ON public.birthday_events FOR DELETE USING (auth.uid() = host_id);

-- guests (RSVP)
CREATE POLICY "birthday guests public read"
  ON public.birthday_guests FOR SELECT USING (TRUE);
CREATE POLICY "birthday guest self rsvp"
  ON public.birthday_guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "birthday guest self update"
  ON public.birthday_guests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "birthday guest self delete"
  ON public.birthday_guests FOR DELETE USING (auth.uid() = user_id);

-- wishlist  (anyone signed-in can add / claim / unclaim; author or host can remove)
CREATE POLICY "birthday wishlist public read"
  ON public.birthday_wishlist FOR SELECT USING (TRUE);
CREATE POLICY "birthday wishlist add"
  ON public.birthday_wishlist FOR INSERT WITH CHECK (auth.uid() = added_by);
CREATE POLICY "birthday wishlist claim"
  ON public.birthday_wishlist FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "birthday wishlist remove"
  ON public.birthday_wishlist FOR DELETE USING (
    auth.uid() = added_by
    OR EXISTS (SELECT 1 FROM public.birthday_events e
               WHERE e.id = event_id AND e.host_id = auth.uid())
  );

-- photos
CREATE POLICY "birthday photos public read"
  ON public.birthday_photos FOR SELECT USING (TRUE);
CREATE POLICY "birthday photos add"
  ON public.birthday_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "birthday photos remove own"
  ON public.birthday_photos FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.birthday_events e
               WHERE e.id = event_id AND e.host_id = auth.uid())
  );

-- chat
CREATE POLICY "birthday messages public read"
  ON public.birthday_messages FOR SELECT USING (TRUE);
CREATE POLICY "birthday messages send"
  ON public.birthday_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "birthday messages delete own"
  ON public.birthday_messages FOR DELETE USING (auth.uid() = user_id);

-- ── REALTIME (live chat + photo wall) ───────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_photos;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_guests;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- already in the publication, ignore
  NULL;
END;
$$;

-- ── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_birthday_events_host  ON public.birthday_events(host_id);
CREATE INDEX IF NOT EXISTS idx_birthday_events_slug  ON public.birthday_events(share_slug);
CREATE INDEX IF NOT EXISTS idx_birthday_events_date  ON public.birthday_events(event_date);
CREATE INDEX IF NOT EXISTS idx_birthday_guests_event ON public.birthday_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_birthday_guests_user  ON public.birthday_guests(user_id);
CREATE INDEX IF NOT EXISTS idx_birthday_wishlist_evt ON public.birthday_wishlist(event_id);
CREATE INDEX IF NOT EXISTS idx_birthday_photos_evt   ON public.birthday_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_birthday_messages_evt ON public.birthday_messages(event_id);
