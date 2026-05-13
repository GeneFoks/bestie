-- BESTIE — Crew Events Migration
-- Run this in Supabase SQL editor after migration_crews.sql

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE public.crew_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  datetime TIMESTAMPTZ NOT NULL,
  max_attendees INTEGER,
  is_members_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.crew_event_attendees (
  event_id UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ==========================================
-- FUNCTION: enforce max_attendees limit
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_cap INTEGER;
BEGIN
  SELECT COUNT(*), e.max_attendees
  INTO current_count, max_cap
  FROM public.crew_event_attendees a
  JOIN public.crew_events e ON e.id = a.event_id
  WHERE a.event_id = NEW.event_id
  GROUP BY e.max_attendees;

  IF max_cap IS NOT NULL AND current_count >= max_cap THEN
    RAISE EXCEPTION 'Event is full (max % attendees)', max_cap;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_event_attendee_insert
  BEFORE INSERT ON public.crew_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.check_event_capacity();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.crew_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_event_attendees ENABLE ROW LEVEL SECURITY;

-- Events: public read, captain-only create/update/delete
CREATE POLICY "Events visible to all"
  ON public.crew_events FOR SELECT USING (TRUE);

CREATE POLICY "Captain can create events"
  ON public.crew_events FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

CREATE POLICY "Captain can update events"
  ON public.crew_events FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

CREATE POLICY "Captain can delete events"
  ON public.crew_events FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

-- Attendees: public read, self join/leave
CREATE POLICY "Attendees visible to all"
  ON public.crew_event_attendees FOR SELECT USING (TRUE);

-- Open events: any authenticated user can join
CREATE POLICY "Anyone can join open events"
  ON public.crew_event_attendees FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_events e
      WHERE e.id = event_id AND e.is_members_only = FALSE
    )
  );

-- Members-only events: only crew members can join
CREATE POLICY "Members can join members-only events"
  ON public.crew_event_attendees FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crew_events e
      JOIN public.crew_members cm ON cm.crew_id = e.crew_id
      WHERE e.id = event_id
        AND e.is_members_only = TRUE
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave events"
  ON public.crew_event_attendees FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_crew_events_crew ON public.crew_events(crew_id);
CREATE INDEX idx_crew_events_datetime ON public.crew_events(datetime);
CREATE INDEX idx_crew_event_attendees_event ON public.crew_event_attendees(event_id);
CREATE INDEX idx_crew_event_attendees_user ON public.crew_event_attendees(user_id);
