-- team_stats siempre al día (idempotente). Ejecutar en Supabase SQL Editor.
--
-- La app móvil arma su tabla con team_stats. Esta migración la recalcula sola
-- cada vez que cambian partidos, equipos o ajustes manuales (desde la web, la app
-- o un script), con las mismas reglas que la tabla de la web:
--   * partido finalizado, regular, cuenta para tabla y no amistoso
--   * solo cuenta para el equipo si el partido es de la categoría del equipo
--   * + ajustes manuales de standings_adjustments
-- Solo toca la temporada activa.

-- ========== 1. Ajustes manuales (por si no se corrió 2026-11-09-ajustes-tabla.sql) ==========
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

-- team_stats debe tener season_id (lo agrega 2026-07-08-seasons.sql; se asegura aquí)
ALTER TABLE public.team_stats ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);

-- Esquemas viejos traen team_id obligatorio; se llena después del INSERT.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'team_stats' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.team_stats ALTER COLUMN team_id DROP NOT NULL;
  END IF;
END $$;

-- ========== 2. Recalcular team_stats de una temporada ==========
CREATE OR REPLACE FUNCTION public.refresh_team_stats(p_season uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_count integer;
BEGIN
  SELECT year INTO v_year FROM seasons WHERE id = p_season;
  IF v_year IS NULL THEN
    RETURN 0;
  END IF;

  -- Serializa recálculos simultáneos para no chocar con UNIQUE(team_name, team_category, season)
  PERFORM pg_advisory_xact_lock(hashtext('refresh_team_stats'));

  DELETE FROM team_stats
  WHERE season_id = p_season
     OR (season_id IS NULL AND season::text = v_year::text);

  INSERT INTO team_stats (
    team_name, team_category, season, season_id,
    games_played, games_won, games_lost, games_tied,
    points_for, points_against, points
  )
  WITH counted AS (
    SELECT g.home_team, g.away_team, g.category,
           coalesce(g.home_score, 0) AS hs, coalesce(g.away_score, 0) AS aws
    FROM games g
    WHERE g.season_id = p_season
      AND g.status = 'finalizado'
      AND g.counts_for_standings = true
      AND g.game_type = 'regular'
      AND g.match_type IS NOT NULL
      AND g.match_type <> 'amistoso'
  ),
  per_team AS (
    SELECT t.id, t.name, t.category,
           count(r.mine) FILTER (WHERE r.mine > r.theirs) AS w,
           count(r.mine) FILTER (WHERE r.mine < r.theirs) AS l,
           count(r.mine) FILTER (WHERE r.mine = r.theirs) AS d,
           coalesce(sum(r.mine), 0) AS pf,
           coalesce(sum(r.theirs), 0) AS pa
    FROM teams t
    LEFT JOIN LATERAL (
      SELECT c.hs AS mine, c.aws AS theirs FROM counted c
      WHERE c.home_team = t.name AND c.category = t.category
      UNION ALL
      SELECT c.aws, c.hs FROM counted c
      WHERE c.away_team = t.name AND c.category = t.category
    ) r ON true
    WHERE t.season_id = p_season
      AND t.status = 'active'
      AND t.category IS NOT NULL
    GROUP BY t.id, t.name, t.category
  )
  SELECT
    p.name, p.category, v_year, p_season,
    (p.w + coalesce(a.wins, 0)) + (p.l + coalesce(a.losses, 0)) + (p.d + coalesce(a.ties, 0)),
    p.w + coalesce(a.wins, 0),
    p.l + coalesce(a.losses, 0),
    p.d + coalesce(a.ties, 0),
    p.pf + coalesce(a.points_for, 0),
    p.pa + coalesce(a.points_against, 0),
    3 * (p.w + coalesce(a.wins, 0)) + (p.d + coalesce(a.ties, 0)) + coalesce(a.points, 0)
  FROM per_team p
  LEFT JOIN standings_adjustments a ON a.season_id = p_season AND a.team_id = p.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'team_stats' AND column_name = 'team_id'
  ) THEN
    EXECUTE
      'UPDATE team_stats ts SET team_id = t.id
       FROM teams t
       WHERE ts.season_id = $1 AND t.season_id = $1
         AND t.name = ts.team_name AND t.category = ts.team_category'
    USING p_season;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_team_stats(uuid) TO service_role;

-- ========== 3. Trigger: recalcular al cambiar partidos, equipos o ajustes ==========
CREATE OR REPLACE FUNCTION public.trg_refresh_team_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season uuid;
BEGIN
  SELECT id INTO v_season FROM seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NOT NULL THEN
    -- Si el recálculo falla, el cambio original (marcador, borrado, etc.) se guarda igual.
    BEGIN
      PERFORM refresh_team_stats(v_season);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_team_stats falló: %', SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS games_refresh_team_stats ON public.games;
CREATE TRIGGER games_refresh_team_stats
AFTER INSERT OR UPDATE OR DELETE ON public.games
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_team_stats();

DROP TRIGGER IF EXISTS teams_refresh_team_stats ON public.teams;
CREATE TRIGGER teams_refresh_team_stats
AFTER INSERT OR UPDATE OR DELETE ON public.teams
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_team_stats();

DROP TRIGGER IF EXISTS standings_adjustments_refresh_team_stats ON public.standings_adjustments;
CREATE TRIGGER standings_adjustments_refresh_team_stats
AFTER INSERT OR UPDATE OR DELETE ON public.standings_adjustments
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_team_stats();

-- ========== 4. Recalcular ya (si falla aquí, sale el error para corregirlo) ==========
SELECT public.refresh_team_stats(id) AS equipos_en_team_stats
FROM public.seasons WHERE is_active = true;

-- Verificación: tabla de la temporada activa como la verá la app
SELECT team_category, team_name, games_played AS pj, games_won AS g, games_tied AS e, games_lost AS p,
       points_for AS pf, points_against AS pc, points AS pts
FROM public.team_stats
WHERE season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY team_category, points DESC, (points_for - points_against) DESC, points_for DESC;
