-- ══════════════════════════════════════════════════════════════════
-- Sparks → allow all current spark types
--
-- The UI (app/sparks/give/GiveSparkContent.tsx) offers 22 spark types,
-- but the sparks.spark_type CHECK constraint in the DB predates several
-- of them (e.g. motivating, high_energy, worldly…). Inserting a newer
-- type fails with a check_violation (SQLSTATE 23514), which surfaced in
-- the app as a generic "Something went wrong."
--
-- This drops the old CHECK and recreates it with the full, current list.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- 1) DIAGNOSTIC (optional) — see the current constraint before changing it:
--    SELECT conname, pg_get_constraintdef(oid)
--      FROM pg_constraint
--     WHERE conrelid = 'public.sparks'::regclass AND contype = 'c';

-- 2) Drop whatever the existing spark_type check is named, then re-add.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.sparks'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%spark_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.sparks DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.sparks
  ADD CONSTRAINT sparks_spark_type_check CHECK (spark_type IN (
    'kind', 'fun', 'reliable', 'genuine', 'safe', 'energetic',
    'good_listener', 'social', 'punctual', 'open', 'focused',
    'insightful', 'motivating', 'supportive', 'creative', 'inspiring',
    'professional', 'articulate', 'calming', 'high_energy', 'worldly',
    'knowledgeable'
  ));
