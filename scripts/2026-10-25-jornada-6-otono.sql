-- Jornada 6 — Otoño 2026 (25 oct 2026, Deportivo Tapias)
-- Desde la imagen del rol J6 (abreviaturas + color de categoría). Campos A–D, 8:00 a 15:00.
-- Partidos publicados directamente (is_draft = false).
-- Requiere 2026-10-23-categorias-libre-otono.sql: mixto y varonil van como mixto-libre / varonil-libre.
-- No incluye 15:00 Campo B "PUM vs MAC" (equipos por confirmar; se carga después).

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
    WHERE season_id = v_season AND jornada = 6 AND game_date = DATE '2026-10-25'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J6 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 6 AND game_date = DATE '2026-10-25';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-10-25', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', 'jornada', 6, 'regular', 'flag', 'regular',
    true, v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'White Axis FC',         'Cobras Prime FC'),
    ('08:00', 'Campo B', 'femenil-cooper-a', 'Anti✦Hero FC',          'Black Ravens A FCA'),
    ('08:00', 'Campo C', 'mixto-libre',      'Pumas el salto  MS',    'BLUEHIDES MS'),
    ('08:00', 'Campo D', 'femenil-cooper-a', 'Ponys 89 A FC',         'Odonto FC'),
    -- 9:00
    ('09:00', 'Campo A', 'femenil-silver',   'Ponys 89 FS',           'Cobras Prime FS'),
    ('09:00', 'Campo B', 'femenil-cooper-b', 'Halconas 130 FC',       'Cobras Prime FC'),
    ('09:00', 'Campo C', 'femenil-cooper-b', 'BLUEHIDES FC',          'Black Ravens B FCB'),
    ('09:00', 'Campo D', 'femenil-cooper-b', 'Osas D FC',             'Aztecas B FCB'),
    -- 10:00
    ('10:00', 'Campo A', 'femenil-silver',   'Lobas ITES  FS',        'Osas B FS'),
    ('10:00', 'Campo B', 'mixto-libre',      'Halcones 130 MS',       'Anti✦Hero'),
    ('10:00', 'Campo C', 'femenil-silver',   'Rebels FS',             'Aztecas FS'),
    ('10:00', 'Campo D', 'femenil-gold',     'DSM OLDIES FG',         'Black Ravens  FG'),
    -- 11:00
    ('11:00', 'Campo A', 'femenil-silver',   'Lobas ITES  FS',        'Rebels FS'),
    ('11:00', 'Campo B', 'femenil-silver',   'Osas A FS',             'Tigres Blancos FS'),
    ('11:00', 'Campo C', 'femenil-cooper-b', 'White Axis FC',         'Bufalos UIM FCB'),
    ('11:00', 'Campo D', 'femenil-cooper-a', 'Axis FC',               'Aztecas FC'),
    -- 12:00
    ('12:00', 'Campo A', 'mixto-libre',      'Halcones 130 MS',       'White Axis MS'),
    ('12:00', 'Campo B', 'femenil-cooper-b', 'Blue Axis FC',          'Osas E FC'),
    ('12:00', 'Campo C', 'mixto-libre',      'Perritos Panzones MS',  'Aztecas MS'),
    ('12:00', 'Campo D', 'mixto-libre',      'Osos MS',               'Goldens MG'),
    -- 13:00
    ('13:00', 'Campo A', 'varonil-libre',    'Escorpiones VS',        'Axis VG'),
    ('13:00', 'Campo B', 'varonil-libre',    'Halcones 130 VS',       'Goldens'),
    ('13:00', 'Campo C', 'varonil-libre',    'Aztecas  VS',           'Búfalos uim VS'),
    ('13:00', 'Campo D', 'mixto-libre',      'Cerberus MS',           'Pumas el salto  MS'),
    -- 14:00
    ('14:00', 'Campo A', 'varonil-libre',    'Halcones 130 VS',       'Malosos '),
    ('14:00', 'Campo B', 'mixto-libre',      'Happy Monos MS',        'Goldens MG'),
    ('14:00', 'Campo C', 'mixto-libre',      'Tlacuaches MS',         'Justice League MG'),
    -- 15:00
    ('15:00', 'Campo A', 'varonil-libre',    'Black Ravens',          'RUST-EZE VG')
  ) AS r(hora, campo, categoria, home, away);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J6: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J6 (deben salir 28 partidos)
SELECT game_time, field, category, home_team, away_team, is_draft
FROM public.games
WHERE jornada = 6 AND game_date = DATE '2026-10-25'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 6 AND g.game_date = DATE '2026-10-25'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;

-- Verificación 3: partidos donde algún equipo es de otra categoría (debe salir vacío)
SELECT g.game_time, g.field, g.category AS categoria_partido,
       g.home_team, h.category AS cat_local,
       g.away_team, a.category AS cat_visita
FROM public.games g
JOIN public.teams h ON h.season_id = g.season_id AND h.name = g.home_team
JOIN public.teams a ON a.season_id = g.season_id AND a.name = g.away_team
WHERE g.jornada = 6 AND g.game_date = DATE '2026-10-25'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (h.category IS DISTINCT FROM g.category OR a.category IS DISTINCT FROM g.category)
ORDER BY g.game_time, g.field;
