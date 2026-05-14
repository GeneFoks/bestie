-- Personal availability calendar
-- Stored as JSONB: { mon: { on: true, from: "09:00", to: "18:00" }, tue: { on: false }, ... }
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS availability JSONB;
