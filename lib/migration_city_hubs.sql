-- Add city to crews table
ALTER TABLE public.crews ADD COLUMN IF NOT EXISTS city TEXT;
