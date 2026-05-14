-- Group Sessions: one host, up to N participants
CREATE TABLE IF NOT EXISTS public.group_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  activity_type    TEXT,
  description      TEXT,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  location         TEXT,
  max_participants INTEGER NOT NULL DEFAULT 6,
  status           TEXT NOT NULL DEFAULT 'open', -- open | full | completed | cancelled
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_session_participants (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_session_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can read group sessions
CREATE POLICY "group_sessions_read" ON public.group_sessions FOR SELECT USING (true);
CREATE POLICY "host_manage_group_sessions" ON public.group_sessions FOR ALL USING (auth.uid() = host_id);

-- Everyone can read participants
CREATE POLICY "participants_read" ON public.group_session_participants FOR SELECT USING (true);
-- Auth users can join/leave
CREATE POLICY "participants_insert" ON public.group_session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants_delete" ON public.group_session_participants FOR DELETE USING (auth.uid() = user_id);

-- RPC: join group session (checks capacity, updates status to full if needed)
CREATE OR REPLACE FUNCTION public.join_group_session(p_session_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_session RECORD;
  v_count   INTEGER;
BEGIN
  SELECT * INTO v_session FROM public.group_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_session.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF v_session.status = 'completed' THEN RETURN 'completed'; END IF;
  IF v_session.host_id = p_user_id THEN RETURN 'is_host'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.group_session_participants WHERE session_id = p_session_id;
  IF v_count >= v_session.max_participants THEN RETURN 'full'; END IF;

  INSERT INTO public.group_session_participants(session_id, user_id)
  VALUES (p_session_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Mark full if reached capacity
  SELECT COUNT(*) INTO v_count FROM public.group_session_participants WHERE session_id = p_session_id;
  IF v_count >= v_session.max_participants THEN
    UPDATE public.group_sessions SET status = 'full' WHERE id = p_session_id;
  END IF;

  RETURN 'joined';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: leave group session
CREATE OR REPLACE FUNCTION public.leave_group_session(p_session_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  DELETE FROM public.group_session_participants WHERE session_id = p_session_id AND user_id = p_user_id;
  -- Re-open if was full
  UPDATE public.group_sessions SET status = 'open'
  WHERE id = p_session_id AND status = 'full';
  RETURN 'left';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
