-- ══════════════════════════════════════════════════════════════════
-- Agora living map → objects placed on the /agora map
--
-- One row per thing on the map: a zone (enclosure/area), a tree (with an
-- owner / donor), a chicken (animated, roams inside its zone), a pond,
-- a building, a plot. Coordinates are in the map's SVG space
-- (viewBox 0 0 1000 620); x,y are the CENTER of the object. Area kinds
-- (zone/pond/building/plot) also use w,h.
--
-- Anyone can VIEW the map. Only admins (users.is_admin) can change it.
-- Realtime-friendly. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agora_objects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL,            -- zone | tree | chicken | pond | building | plot
  label       TEXT,
  owner_name  TEXT,                     -- e.g. donor whose tree this is
  note        TEXT,
  zone        TEXT,                     -- animated objects roam inside the zone with this key
  x           REAL NOT NULL DEFAULT 500,
  y           REAL NOT NULL DEFAULT 310,
  w           REAL,
  h           REAL,
  animated    BOOLEAN NOT NULL DEFAULT false,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.agora_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agora viewable by all" ON public.agora_objects;
CREATE POLICY "agora viewable by all"
  ON public.agora_objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "agora admin write" ON public.agora_objects;
CREATE POLICY "agora admin write"
  ON public.agora_objects FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

-- Starter scene — only if the map is empty.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.agora_objects) THEN
    INSERT INTO public.agora_objects (kind,label,zone,x,y,w,h) VALUES
      ('zone','Chicken run','chicken_run',640,400,380,210),
      ('pond','Pond',NULL,180,470,220,130),
      ('building','Barn',NULL,210,150,180,120),
      ('plot','Vegetable beds',NULL,440,520,300,120);
    INSERT INTO public.agora_objects (kind,label,owner_name,x,y) VALUES
      ('tree','Oak','Maria K.',430,210),
      ('tree','Apple','Andrei',540,300),
      ('tree','Linden','The Volkov family',330,330);
    INSERT INTO public.agora_objects (kind,label,zone,x,y,animated) VALUES
      ('chicken','Henrietta','chicken_run',640,400,true),
      ('chicken','Ryaba','chicken_run',700,430,true),
      ('chicken','Mabel','chicken_run',590,420,true),
      ('chicken','Dotty','chicken_run',680,380,true);
  END IF;
END $$;
