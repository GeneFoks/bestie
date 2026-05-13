-- BESTIE — Crews Migration
-- Run this in Supabase SQL editor after schema.sql

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE public.crews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  captain_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  max_members INTEGER DEFAULT 108,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.crew_members (
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);

-- crew_id on users — one user, one crew
ALTER TABLE public.users ADD COLUMN crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL;

-- ==========================================
-- VIEW: crew rankings
-- ==========================================

CREATE VIEW public.crew_rankings AS
SELECT
  c.id AS crew_id,
  c.name,
  c.slug,
  c.avatar_url,
  c.is_public,
  c.created_at,
  COUNT(cm.user_id) AS member_count,
  ROUND(AVG(u.bestie_score)) AS avg_bestie_score
FROM public.crews c
LEFT JOIN public.crew_members cm ON cm.crew_id = c.id
LEFT JOIN public.users u ON u.id = cm.user_id
GROUP BY c.id
ORDER BY avg_bestie_score DESC NULLS LAST;

-- ==========================================
-- FUNCTION: enforce 108 member limit
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_crew_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_cap INTEGER;
BEGIN
  SELECT COUNT(*), c.max_members
  INTO current_count, max_cap
  FROM public.crew_members cm
  JOIN public.crews c ON c.id = cm.crew_id
  WHERE cm.crew_id = NEW.crew_id
  GROUP BY c.max_members;

  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'Crew is full (max % members)', max_cap;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_crew_member_insert
  BEFORE INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.check_crew_capacity();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Crews: public read, captain manages own
CREATE POLICY "Crews visible to all"
  ON public.crews FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create crews"
  ON public.crews FOR INSERT WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Captain can update own crew"
  ON public.crews FOR UPDATE USING (auth.uid() = captain_id);

CREATE POLICY "Captain can delete own crew"
  ON public.crews FOR DELETE USING (auth.uid() = captain_id);

-- Crew members: public read, self-join for public crews, captain-invite for private
CREATE POLICY "Crew members visible to all"
  ON public.crew_members FOR SELECT USING (TRUE);

CREATE POLICY "Users can join public crews"
  ON public.crew_members FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.is_public = TRUE
    )
  );

CREATE POLICY "Captain can add members to private crew"
  ON public.crew_members FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

CREATE POLICY "Members can leave, captain can remove"
  ON public.crew_members FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.captain_id = auth.uid()
    )
  );

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_crews_slug ON public.crews(slug);
CREATE INDEX idx_crews_is_public ON public.crews(is_public);
CREATE INDEX idx_crew_members_crew ON public.crew_members(crew_id);
CREATE INDEX idx_crew_members_user ON public.crew_members(user_id);
CREATE INDEX idx_users_crew ON public.users(crew_id);
