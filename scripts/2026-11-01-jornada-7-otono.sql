-- Jornada 7 — Otoño 2026 (1 nov 2026, Deportivo Tapias)
-- Desde la imagen del rol J7 (abreviaturas + color de categoría). Campos A–D, 8:00 a 14:00.
-- Partidos publicados directamente (is_draft = false).
-- Requiere 2026-10-23-categorias-libre-otono.sql: mixto y varonil van como mixto-libre / varonil-libre.
--
-- Grises / negros = amistoso (match_type amistoso, game_type friendly, NO suman puntos).
--   Incluye los negros AX vs OSB y BR vs PON (cruces Cooper vs Silver).
-- No incluye 14:00 Campo A "AX vs MAC" (MAC por confirmar; se carga después).
-- 8:00 y 9:00 Campo B salen los dos como "130 vs BLU" mixto, como en el rol.

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
    WHERE season_id = v_season AND jornada = 7 AND game_date = DATE '2026-11-01'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J7 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 7 AND game_date = DATE '2026-11-01';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-11-01', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', r.match_type, 7, 'regular', 'flag', r.game_type,
    (r.game_type = 'regular'), v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'White Axis FC',        'Halconas 130 FC',     'jornada',  'regular'),
    ('08:00', 'Campo B', 'mixto-libre',      'Halcones 130 MS',      'BLUEHIDES MS',        'jornada',  'regular'),
    ('08:00', 'Campo C', 'femenil-cooper-a', 'Ponys 89 A FC',        'Cobras Prime FC',     'amistoso', 'friendly'), -- PON coop vs COP
    ('08:00', 'Campo D', 'femenil-cooper-a', 'Odonto FC',            'Black Ravens B FCB',  'amistoso', 'friendly'), -- ODO vs BR
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',              'Osas B FS',           'amistoso', 'friendly'), -- AX vs OSB (negro)
    ('09:00', 'Campo B', 'mixto-libre',      'Halcones 130 MS',      'BLUEHIDES MS',        'jornada',  'regular'),
    ('09:00', 'Campo C', 'femenil-cooper-b', 'Cobras Prime FC',      'Osas E FC',           'jornada',  'regular'),
    ('09:00', 'Campo D', 'femenil-cooper-a', 'Black Ravens A FCA',   'Ponys 89 FS',         'amistoso', 'friendly'), -- BR vs PON (negro)
    -- 10:00
    ('10:00', 'Campo A', 'femenil-cooper-a', 'Osas C FC',            'Mini Axis FC',        'amistoso', 'friendly'), -- OSC vs MAX
    ('10:00', 'Campo B', 'femenil-cooper-b', 'White Axis FC',        'Aztecas FC',          'amistoso', 'friendly'), -- AXB vs AZT
    ('10:00', 'Campo C', 'femenil-cooper-a', 'Anti✦Hero FC',         'Blue Axis FC',        'amistoso', 'friendly'), -- ANT vs BAX
    ('10:00', 'Campo D', 'femenil-silver',   'Tigres Blancos FS',    'Aztecas FS',          'jornada',  'regular'),
    -- 11:00
    ('11:00', 'Campo A', 'mixto-libre',      'Happy Monos MS',       'Axis MG',             'jornada',  'regular'),
    ('11:00', 'Campo B', 'femenil-silver',   'Osas A FS',            'Rebels FS',           'jornada',  'regular'),
    ('11:00', 'Campo C', 'varonil-libre',    'Halcones 130 VS',      'Black Ravens',        'jornada',  'regular'),
    ('11:00', 'Campo D', 'mixto-libre',      'Perritos Panzones MS', 'Anti✦Hero',           'jornada',  'regular'),
    -- 12:00
    ('12:00', 'Campo A', 'mixto-libre',      'White Axis MS',        'Perritos Panzones MS','jornada',  'regular'),
    ('12:00', 'Campo B', 'mixto-libre',      'Osos MS',              'Aztecas MS',          'jornada',  'regular'),
    ('12:00', 'Campo C', 'mixto-libre',      'Cerberus MS',          'Anti✦Hero',           'jornada',  'regular'),
    -- 13:00
    ('13:00', 'Campo A', 'mixto-libre',      'Aztecas MS',           'Justice League MG',   'jornada',  'regular'),
    ('13:00', 'Campo B', 'mixto-libre',      'Tlacuaches MS',        'Black Ravens MG',     'jornada',  'regular'),
    ('13:00', 'Campo C', 'varonil-libre',    'Escorpiones VS',       'Goldens',             'jornada',  'regular'),
    -- 14:00
    ('14:00', 'Campo B', 'mixto-libre',      'Aztecas MS',           'RUST-EZE VG',         'jornada',  'regular'), -- AZT vs RUS (cruce mixto/varonil)
    ('14:00', 'Campo C', 'mixto-libre',      'Rebels MS',            'Goldens MG',          'jornada',  'regular')
  ) AS r(hora, campo, categoria, home, away, match_type, game_type);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J7: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J7 (deben salir 24 partidos; 7 amistosos)
SELECT game_time, field, category, home_team, away_team, match_type, game_type, counts_for_standings
FROM public.games
WHERE jornada = 7 AND game_date = DATE '2026-11-01'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 7 AND g.game_date = DATE '2026-11-01'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;

-- Verificación 3: partidos OFICIALES donde algún equipo es de otra categoría (amistosos se omiten)
-- AZT vs RUS puede salir: RUST-EZE VG es varonil y el partido quedó en mixto-libre (categoría del local).
SELECT g.game_time, g.field, g.category AS categoria_partido,
       g.home_team, h.category AS cat_local,
       g.away_team, a.category AS cat_visita
FROM public.games g
JOIN public.teams h ON h.season_id = g.season_id AND h.name = g.home_team
JOIN public.teams a ON a.season_id = g.season_id AND a.name = g.away_team
WHERE g.jornada = 7 AND g.game_date = DATE '2026-11-01'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND g.match_type IS DISTINCT FROM 'amistoso'
  AND (h.category IS DISTINCT FROM g.category OR a.category IS DISTINCT FROM g.category)
ORDER BY g.game_time, g.field;
