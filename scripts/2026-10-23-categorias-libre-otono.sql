-- Categorías Libre — Otoño 2026 (temporada activa)
--   Varonil Gold + Varonil Silver → varonil-libre
--   Mixto Gold   + Mixto Silver   → mixto-libre (nueva)
-- Solo afecta la temporada activa; temporadas anteriores quedan intactas.
-- Los nombres de equipo (sufijos VG/VS/MG/MS) NO se cambian porque los partidos
-- referencian equipos por nombre.
-- Ejecutar en Supabase SQL Editor.

-- ========== 1. Permitir mixto-libre en teams ==========
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_category_check;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'varonil-libre',
      'varonil-gold',
      'varonil-master',
      'varonil-silver',
      'varonil-cooper',
      'femenil-gold',
      'femenil-silver',
      'femenil-cooper',
      'femenil-cooper-a',
      'femenil-cooper-b',
      'mixto-libre',
      'mixto-gold',
      'mixto-silver',
      'mixto-cooper',
      'mixto-recreativo',
      'teens',
      '1v1'
    )
  );

-- ========== 2. Mover equipos, partidos y registros de la temporada activa ==========
DO $$
DECLARE
  v_season uuid;
  v_table text;
  v_count integer;
BEGIN
  SELECT id INTO v_season FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No hay temporada activa';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'teams', 'games', 'mvps', 'team_stats', 'player_stats', 'standings', 'schedule_slot_requests'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'category'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'season_id'
      )
    THEN
      EXECUTE format(
        'UPDATE public.%I SET category = ''varonil-libre''
         WHERE season_id = $1 AND category IN (''varonil-gold'', ''varonil-silver'')',
        v_table
      ) USING v_season;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '% → varonil-libre: % filas', v_table, v_count;

      EXECUTE format(
        'UPDATE public.%I SET category = ''mixto-libre''
         WHERE season_id = $1 AND category IN (''mixto-gold'', ''mixto-silver'')',
        v_table
      ) USING v_season;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '% → mixto-libre: % filas', v_table, v_count;
    END IF;
  END LOOP;
END $$;

-- Verificación 1: equipos por categoría en la temporada activa
SELECT category, count(*) AS equipos, string_agg(name, ', ' ORDER BY name) AS nombres
FROM public.teams
WHERE season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND category IN ('varonil-libre', 'mixto-libre', 'varonil-gold', 'varonil-silver', 'mixto-gold', 'mixto-silver')
GROUP BY category
ORDER BY category;

-- Verificación 2: partidos por categoría (no deben quedar gold/silver varonil ni mixto)
SELECT category, count(*) AS partidos
FROM public.games
WHERE season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND category IN ('varonil-libre', 'mixto-libre', 'varonil-gold', 'varonil-silver', 'mixto-gold', 'mixto-silver')
GROUP BY category
ORDER BY category;
