-- BESTIE — Crew Ratings Migration

CREATE TABLE public.crew_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

ALTER TABLE public.crew_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crew ratings"
  ON public.crew_ratings FOR SELECT USING (TRUE);

CREATE POLICY "Members can rate crew"
  ON public.crew_ratings FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = crew_ratings.crew_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can update own rating"
  ON public.crew_ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_crew_ratings_crew ON public.crew_ratings(crew_id);

-- Update crew_rankings view to include avg crew rating
DROP VIEW IF EXISTS public.crew_rankings;
CREATE VIEW public.crew_rankings AS
SELECT
  c.id AS crew_id,
  c.name,
  c.slug,
  c.avatar_url,
  c.is_public,
  c.captain_id,
  COUNT(DISTINCT cm.user_id) AS member_count,
  COALESCE(ROUND(AVG(u.bestie_score)), 0) AS avg_bestie_score,
  COALESCE(ROUND(AVG(cr.rating)::numeric, 1), 0) AS avg_crew_rating,
  COUNT(DISTINCT cr.id) AS rating_count
FROM public.crews c
LEFT JOIN public.crew_members cm ON cm.crew_id = c.id
LEFT JOIN public.users u ON u.id = cm.user_id
LEFT JOIN public.crew_ratings cr ON cr.crew_id = c.id
GROUP BY c.id;
