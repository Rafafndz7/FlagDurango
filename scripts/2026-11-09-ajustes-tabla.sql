-- Ajustes manuales a la tabla de posiciones (idempotente)
-- Ejecutar en Supabase SQL Editor.
--
-- Cada fila suma (o resta, si es negativo) sobre lo que sale de los partidos:
--   wins / losses / ties  → también mueven PJ y los puntos (3 por G, 1 por E)
--   points_for / points_against → PF / PC (y la diferencia)
--   points → puntos extra o sanción, aparte de G/E

CREATE TABLE IF NOT EXISTS public.standings_adjustments (
  id bigserial PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  ties integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_standings_adjustments_season ON public.standings_adjustments(season_id);

ALTER TABLE public.standings_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ajustes de tabla visibles para todos" ON public.standings_adjustments;
CREATE POLICY "Ajustes de tabla visibles para todos" ON public.standings_adjustments FOR SELECT USING (true);

GRANT SELECT ON public.standings_adjustments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.standings_adjustments TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
