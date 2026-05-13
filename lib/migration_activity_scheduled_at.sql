-- Add scheduled_at to activity_packages
ALTER TABLE public.activity_packages
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
