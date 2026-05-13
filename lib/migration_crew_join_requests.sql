-- BESTIE — Crew Join Requests Migration

CREATE TABLE public.crew_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

ALTER TABLE public.crew_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can see their own requests; captain can see all requests for their crew
CREATE POLICY "Users see own requests, captain sees crew requests"
  ON public.crew_join_requests FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.crews c WHERE c.id = crew_id AND c.captain_id = auth.uid())
  );

-- Authenticated users can create requests for themselves
CREATE POLICY "Users can request to join"
  ON public.crew_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Captain can update status (accept/decline)
CREATE POLICY "Captain can update request status"
  ON public.crew_join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.crews c WHERE c.id = crew_id AND c.captain_id = auth.uid())
  );

-- Users can cancel their own pending request
CREATE POLICY "Users can cancel own request"
  ON public.crew_join_requests FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_crew_join_requests_crew ON public.crew_join_requests(crew_id, status);
CREATE INDEX idx_crew_join_requests_user ON public.crew_join_requests(user_id);
