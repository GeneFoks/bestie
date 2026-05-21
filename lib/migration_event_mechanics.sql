-- BESTIE — Event mechanics: RSVP states + reminder tracking
-- Phase 2: adds nuanced attendance and a way to dedupe reminder pushes.
-- Run in Supabase SQL editor after migration_crew_events.sql.

-- ==========================================
-- 1. RSVP status on event attendance
-- 'going'         — confirmed, counts toward attendees / capacity
-- 'maybe'         — interested, doesn't count toward capacity
-- 'cant_make'     — explicit no — used so the host knows + we can stop sending reminders
-- ==========================================

ALTER TABLE public.crew_event_attendees
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'going'
  CHECK (status IN ('going', 'maybe', 'cant_make'));

CREATE INDEX IF NOT EXISTS idx_crew_event_attendees_status
  ON public.crew_event_attendees(event_id, status);

-- Update capacity trigger so only 'going' counts toward max_attendees
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_cap INTEGER;
BEGIN
  -- Only count rows whose final status will be 'going'
  IF NEW.status <> 'going' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), e.max_attendees
  INTO current_count, max_cap
  FROM public.crew_event_attendees a
  JOIN public.crew_events e ON e.id = a.event_id
  WHERE a.event_id = NEW.event_id AND a.status = 'going'
  GROUP BY e.max_attendees;

  IF max_cap IS NOT NULL AND current_count >= max_cap THEN
    RAISE EXCEPTION 'Event is full (max % attendees)', max_cap;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update-trigger: also enforce capacity when status moves to 'going'
DROP TRIGGER IF EXISTS on_event_attendee_update ON public.crew_event_attendees;
CREATE TRIGGER on_event_attendee_update
  BEFORE UPDATE ON public.crew_event_attendees
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'going')
  EXECUTE FUNCTION public.check_event_capacity();

-- Members can update their own RSVP status
CREATE POLICY "Users can update own RSVP"
  ON public.crew_event_attendees FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 2. Reminder dedup table: tracks which reminders have been sent
-- so we don't fire the same push twice if the cron retries.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.event_reminders_sent (
  event_id UUID REFERENCES public.crew_events(id) ON DELETE CASCADE NOT NULL,
  user_id  UUID REFERENCES public.users(id)       ON DELETE CASCADE NOT NULL,
  kind     TEXT NOT NULL CHECK (kind IN ('24h', '1h')),
  sent_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id, kind)
);

ALTER TABLE public.event_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only the service role inserts to this table; nothing else needs access.
CREATE POLICY "Service role only"
  ON public.event_reminders_sent FOR ALL USING (FALSE);
