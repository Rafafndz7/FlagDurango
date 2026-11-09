-- 1) MVPs: arregla restricciones viejas que bloquean asignar el jugador de la semana
--    (la columna "season" tiene default '2025' y algunas bases tienen un UNIQUE
--    por categoría + semana + season sin season_id, que choca con la temporada pasada).
-- 2) Agrega mvps.game_id para ligar el MVP de partido con su juego.
-- 3) Crea la tabla de la galería de fotos por jornada.
-- Se puede correr varias veces.

ALTER TABLE public.mvps ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);
ALTER TABLE public.mvps ADD COLUMN IF NOT EXISTS game_id integer REFERENCES public.games(id) ON DELETE SET NULL;
ALTER TABLE public.mvps ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS idx_mvps_season_type ON public.mvps (season_id, mvp_type);
CREATE INDEX IF NOT EXISTS idx_mvps_game_id ON public.mvps (game_id);

DO $$
DECLARE r record;
BEGIN
  -- UNIQUE que no distinguen temporada
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.mvps'::regclass
      AND c.contype = 'u'
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND a.attname = 'season_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.mvps DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Quitado UNIQUE %', r.conname;
  END LOOP;

  FOR r IN
    SELECT i.relname
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE x.indrelid = 'public.mvps'::regclass
      AND x.indisunique AND NOT x.indisprimary
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey) AND a.attname = 'season_id'
      )
  LOOP
    EXECUTE format('DROP INDEX public.%I', r.relname);
    RAISE NOTICE 'Quitado índice único %', r.relname;
  END LOOP;

  -- CHECK de categorías viejos (la app ya valida la categoría)
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.mvps'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.mvps DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Quitado CHECK %', r.conname;
  END LOOP;
END $$;

-- La columna de texto "season" queda con el año de su temporada
UPDATE public.mvps m
SET season = s.year::text
FROM public.seasons s
WHERE m.season_id = s.id AND m.season IS DISTINCT FROM s.year::text;

-- Liga los MVP de partido que ya tenían "partido #ID" en la nota
UPDATE public.mvps
SET game_id = substring(notes FROM 'partido #(\d+)')::int
WHERE mvp_type = 'game' AND game_id IS NULL AND notes ~ 'partido #\d+'
  AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = substring(notes FROM 'partido #(\d+)')::int);

-- Galería de fotos por jornada (los archivos viven en el bucket público "uploads")
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id bigserial PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  jornada integer NOT NULL,
  url text NOT NULL,
  thumb_url text NOT NULL,
  storage_path text NOT NULL,
  thumb_path text NOT NULL,
  width integer,
  height integer,
  size_bytes integer,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_season_jornada ON public.gallery_photos (season_id, jornada, created_at);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gallery_photos_public_read ON public.gallery_photos;
CREATE POLICY gallery_photos_public_read ON public.gallery_photos FOR SELECT USING (true);
GRANT SELECT ON public.gallery_photos TO anon, authenticated;

-- Verificación: restricciones que quedan en mvps
SELECT conname, contype, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.mvps'::regclass
ORDER BY conname;
