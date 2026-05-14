-- Approximate location for map (city-level precision, user opt-in)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lng FLOAT;
