-- Jornada 4 — Otoño 2026 (11 oct 2026, Deportivo Tapias)
-- Desde la imagen del rol J4 (abreviaturas + color de categoría). Campos A–D.
-- Partidos publicados directamente (is_draft = false).
-- REVISAR antes de correr:
--   * 12:00 Campo C "ANT vs PUM" (color beige): se carga como Mixto Silver (el pendiente de J3).
--   * 14:00 Campo A "PUM vs AX" (naranja oscuro): Pumas el salto MS vs Axis MG, se carga como Mixto Gold.
--   * 8:00 Campo C "COP vs HAL": HAL = Halconas Verdes FC (130 = Halconas 130 FC).

DO $$
DECLARE
  v_season uuid;
  v_year integer;
  v_deleted integer;
  v_inserted integer;
BEGIN
  SELECT id, year INTO v_season, v_year FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No hay temporada activa';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.games
    WHERE season_id = v_season AND jornada = 4 AND game_date = DATE '2026-10-11'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J4 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 4 AND game_date = DATE '2026-10-11';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-10-11', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', 'jornada', 4, 'regular', 'flag', 'regular',
    true, v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'BLUEHIDES FC',          'White Axis FC'),
    ('08:00', 'Campo B', 'femenil-silver',   'Aztecas FS',            'Lobas ITES  FS'),
    ('08:00', 'Campo C', 'femenil-cooper-b', 'Cobras Prime FC',       'Halconas Verdes FC'),
    ('08:00', 'Campo D', 'femenil-cooper-a', 'Anti✦Hero FC',          'Ponys 89 A FC'),
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-b', 'Halconas 130 FC',       'Mini Axis FC'),
    ('09:00', 'Campo B', 'mixto-silver',     'Anti✦Hero',             'BLUEHIDES MS'),
    ('09:00', 'Campo C', 'femenil-silver',   'Cobras Prime FS',       'Lobas ITES  FS'),
    ('09:00', 'Campo D', 'femenil-cooper-b', 'Osas E FC',             'Black Ravens B FCB'),
    -- 10:00
    ('10:00', 'Campo A', 'femenil-cooper-b', 'Blue Axis FC',          'Osas D FC'),
    ('10:00', 'Campo B', 'femenil-cooper-a', 'Odonto FC',             'Osas C FC'),
    ('10:00', 'Campo C', 'femenil-silver',   'Tigres Blancos FS',     'Ponys 89 FS'),
    ('10:00', 'Campo D', 'mixto-silver',     'Cerberus MS',           'Aztecas MS'),
    -- 11:00
    ('11:00', 'Campo A', 'mixto-silver',     'White Axis MS',         'Pumas el salto  MS'),
    ('11:00', 'Campo B', 'femenil-silver',   'Aztecas FS',            'Osas A FS'),
    ('11:00', 'Campo C', 'mixto-silver',     'Rebels MS',             'Tlacuaches MS'),
    ('11:00', 'Campo D', 'femenil-cooper-b', 'Aztecas B FCB',         'Bufalos UIM FCB'),
    -- 12:00
    ('12:00', 'Campo A', 'femenil-silver',   'Rebels FS',             'Osas B FS'),
    ('12:00', 'Campo B', 'mixto-silver',     'Halcones 130 MS',       'Happy Monos MS'),
    ('12:00', 'Campo C', 'mixto-silver',     'Anti✦Hero',             'Pumas el salto  MS'),
    ('12:00', 'Campo D', 'femenil-cooper-a', 'Aztecas FC',            'Black Ravens A FCA'),
    -- 13:00
    ('13:00', 'Campo A', 'varonil-silver',   'Rockets VG',            'Malosos '),
    ('13:00', 'Campo B', 'varonil-silver',   'Black Ravens',          'Escorpiones VS'),
    ('13:00', 'Campo C', 'varonil-silver',   'Perritos Panzones VS',  'Aztecas  VS'),
    ('13:00', 'Campo D', 'varonil-silver',   'Halcones 130 VS',       'Búfalos uim VS'),
    -- 14:00
    ('14:00', 'Campo A', 'mixto-gold',       'Pumas el salto  MS',    'Axis MG'),
    ('14:00', 'Campo B', 'mixto-gold',       'Goldens MG',            'Black Ravens MG'),
    ('14:00', 'Campo C', 'mixto-silver',     'Osos MS',               'Perritos Panzones MS')
  ) AS r(hora, campo, categoria, home, away);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J4: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J4 (deben salir 27 partidos)
SELECT game_time, field, category, home_team, away_team, is_draft
FROM public.games
WHERE jornada = 4 AND game_date = DATE '2026-10-11'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 4 AND g.game_date = DATE '2026-10-11'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;
