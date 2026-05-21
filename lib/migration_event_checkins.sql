-- BESTIE — Phase 4: Event check-ins & photo gallery
-- Proof of meetings — closes the loop "RSVP → showed up → photo memory"
-- Run in Supabase SQL editor.

-- ==========================================
-- 1. EVENT CHECK-INS
-- One row per (event, user) when they confirm "I showed up".
-- Optional location (lat/lng) and an optional photo_url.
-- A photo URL alone doesn't constitute a check-in; the check-in row does.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.event_checkins (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id    UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id)       ON DELETE CASCADE NOT NULL,
  photo_url   TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user  ON public.event_checkins(user_id);

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Anyone can SEE check-ins for events they have access to (visibility = event RLS).
CREATE POLICY "Read checkins via event visibility"
  ON public.event_checkins FOR SELECT USING (TRUE);

-- A user can check in only to events they 'going'-RSVPd to, and only as themselves.
CREATE POLICY "Going attendees can check in"
  ON public.event_checkins FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_event_attendees a
      WHERE a.event_id = event_id
        AND a.user_id = auth.uid()
        AND a.status = 'going'
    )
  );

-- A user can remove their own check-in (in case they tapped by mistake)
CREATE POLICY "Users can delete own checkin"
  ON public.event_checkins FOR DELETE USING (auth.uid() = user_id);

-- Allow the user to update photo_url or coords after the fact (e.g. they took
-- the photo after pressing check-in)
CREATE POLICY "Users can update own checkin"
  ON public.event_checkins FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 2. EVENT PHOTO GALLERY
-- Photos beyond the initial check-in selfie — anyone in the event can add.
-- A user can have multiple photos per event.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.event_photos (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id    UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id)       ON DELETE SET NULL,
  photo_url   TEXT NOT NULL,
  caption     TEXT CHECK (char_length(caption) <= 200),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event ON public.event_photos(event_id, created_at DESC);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read event photos"
  ON public.event_photos FOR SELECT USING (TRUE);

CREATE POLICY "Going attendees can post photos"
  ON public.event_photos FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_event_attendees a
      WHERE a.event_id = event_id
        AND a.user_id = auth.uid()
        AND a.status = 'going'
    )
  );

CREATE POLICY "Users can delete own photos"
  ON public.event_photos FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. STORAGE BUCKET — event-photos
-- Run separately if not auto-created:
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('event-photos', 'event-photos', TRUE);
--
-- Storage policies:
-- CREATE POLICY "Public read event photos"
--   ON storage.objects FOR SELECT USING (bucket_id = 'event-photos');
-- CREATE POLICY "Auth users upload event photos"
--   ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'event-photos' AND auth.uid() IS NOT NULL
--   );
-- CREATE POLICY "Users delete own event photos"
--   ON storage.objects FOR DELETE USING (
--     bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- ==========================================
-- 4. session_confirmed trigger via mutual check-in
-- When user A and user B both check in to the same event, find any pending
-- booking between them and mark both confirmed. Closes the meet loop.
-- ==========================================

CREATE OR REPLACE FUNCTION public.confirm_mutual_checkin()
RETURNS TRIGGER AS $$
DECLARE
  other_user UUID;
BEGIN
  FOR other_user IN
    SELECT user_id
    FROM public.event_checkins
    WHERE event_id = NEW.event_id AND user_id <> NEW.user_id
  LOOP
    -- Mark both sides of any pending booking between the two
    UPDATE public.bookings
    SET
      confirmed_by_seeker   = TRUE,
      confirmed_by_provider = TRUE,
      status = 'completed'
    WHERE status IN ('accepted', 'pending')
      AND (
        (seeker_id   = NEW.user_id AND provider_id = other_user) OR
        (seeker_id   = other_user  AND provider_id = NEW.user_id)
      )
      AND (confirmed_by_seeker IS NOT TRUE OR confirmed_by_provider IS NOT TRUE);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_checkin ON public.event_checkins;
CREATE TRIGGER on_event_checkin
  AFTER INSERT ON public.event_checkins
  FOR EACH ROW EXECUTE FUNCTION public.confirm_mutual_checkin();
