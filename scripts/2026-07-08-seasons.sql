-- Temporadas Flag Durango. Migración idempotente y sin borrado de datos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_active boolean NOT NULL DEFAULT false,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year)
);

CREATE UNIQUE INDEX IF NOT EXISTS seasons_one_active_idx
  ON public.seasons (is_active) WHERE is_active;

CREATE OR REPLACE FUNCTION public.set_active_season(target_id uuid)
RETURNS public.seasons
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE selected public.seasons;
BEGIN
  UPDATE seasons SET is_active = false, status = CASE WHEN status = 'active' THEN 'archived' ELSE status END,
    updated_at = now() WHERE is_active;
  UPDATE seasons SET is_active = true, status = 'active', updated_at = now()
    WHERE id = target_id RETURNING * INTO selected;
  IF selected.id IS NULL THEN RAISE EXCEPTION 'Temporada no encontrada'; END IF;
  RETURN selected;
END $$;

INSERT INTO public.seasons (name, year, status, is_active)
VALUES ('Temporada 2025', 2025, 'archived', false)
ON CONFLICT (year) DO NOTHING;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'games','matches','playoff_games','playoffs','team_stats','player_stats',
    'standings','rankings','mvps','mvp','awards'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id)', table_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (season_id)', 'idx_' || table_name || '_season_id', table_name);
    END IF;
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.games ADD COLUMN IF NOT EXISTS game_type text DEFAULT 'regular';
ALTER TABLE IF EXISTS public.games ADD COLUMN IF NOT EXISTS sport_type text DEFAULT 'flag';
ALTER TABLE IF EXISTS public.games ADD COLUMN IF NOT EXISTS counts_for_standings boolean DEFAULT true;

DO $$
DECLARE legacy_trigger record;
BEGIN
  IF to_regclass('public.games') IS NOT NULL THEN
    -- El proyecto puede conservar triggers antiguos que acumulan team_stats
    -- usando un esquema incompatible y sin separar temporadas/playoffs.
    -- Se eliminan solo los triggers de games ligados a update_team_stats().
    FOR legacy_trigger IN
      SELECT trigger_row.tgname
      FROM pg_trigger trigger_row
      JOIN pg_proc trigger_function ON trigger_function.oid = trigger_row.tgfoid
      JOIN pg_class trigger_table ON trigger_table.oid = trigger_row.tgrelid
      JOIN pg_namespace trigger_schema ON trigger_schema.oid = trigger_table.relnamespace
      WHERE trigger_schema.nspname = 'public'
        AND trigger_table.relname = 'games'
        AND trigger_function.proname = 'update_team_stats'
        AND NOT trigger_row.tgisinternal
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.games', legacy_trigger.tgname);
    END LOOP;

    -- `game_type` se usaba antes para flag/wildbrowl. Retirar la validación
    -- antigua antes de convertirlo en el tipo competitivo del partido.
    ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
    UPDATE public.games
      SET sport_type = game_type
      WHERE game_type IN ('flag', 'wildbrowl');

    UPDATE games
    SET game_type = CASE
      WHEN lower(coalesce(stage, '')) IN ('playoff','playoffs','comodin','cuartos','semifinal','final')
        OR lower(coalesce(stage, '')) LIKE '%comodin%'
        OR lower(coalesce(stage, '')) LIKE '%semifinal%'
        OR lower(coalesce(stage, '')) LIKE '%final%'
        OR lower(coalesce(match_type, '')) IN ('playoff','playoffs') THEN 'playoff'
      WHEN lower(coalesce(match_type, '')) IN ('amistoso','friendly','exhibicion','exhibición') THEN 'friendly'
      ELSE 'regular' END
    WHERE game_type IS NULL OR game_type NOT IN ('regular','playoff','friendly');

    ALTER TABLE public.games
      ADD CONSTRAINT games_game_type_check
      CHECK (game_type IN ('regular','playoff','friendly'));
    ALTER TABLE public.games ALTER COLUMN game_type SET DEFAULT 'regular';

    UPDATE games SET counts_for_standings = (game_type = 'regular');
    UPDATE games SET season_id = (SELECT id FROM seasons WHERE year = 2025)
      WHERE season_id IS NULL AND (season IS NULL OR season::text = '2025');
    UPDATE games SET season_id = (SELECT id FROM seasons WHERE year = 2025)
      WHERE season_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_games_season_date ON games (season_id, game_date);
    CREATE INDEX IF NOT EXISTS idx_games_season_type ON games (season_id, game_type);
    CREATE INDEX IF NOT EXISTS idx_games_season_standings ON games (season_id, counts_for_standings);
  END IF;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['team_stats','player_stats','standings','rankings','mvps','mvp','awards'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET season_id = (SELECT id FROM public.seasons WHERE year = 2025) WHERE season_id IS NULL',
        table_name
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_game_competition_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.season_id IS NULL THEN RAISE EXCEPTION 'season_id es obligatorio'; END IF;
  NEW.game_type := CASE
    WHEN NEW.game_type IN ('regular','playoff','friendly') THEN NEW.game_type
    ELSE 'regular' END;
  NEW.counts_for_standings := (NEW.game_type = 'regular');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS games_normalize_competition_fields ON public.games;
CREATE TRIGGER games_normalize_competition_fields
BEFORE INSERT OR UPDATE OF season_id, game_type, counts_for_standings ON public.games
FOR EACH ROW EXECUTE FUNCTION public.normalize_game_competition_fields();

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Temporadas visibles para todos" ON public.seasons;
CREATE POLICY "Temporadas visibles para todos" ON public.seasons FOR SELECT USING (true);

GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_season(uuid) TO service_role;
