-- Jornada 5 — Otoño 2026 (18 oct 2026, Deportivo Tapias)
-- Desde la imagen del rol J5 (abreviaturas + color de categoría). Campos A–D, 8:00 a 15:00.
-- Partidos publicados directamente (is_draft = false).
-- REVISAR antes de correr:
--   * 8:00 Campo C "UIM vs HAL": HAL = Halconas Verdes FC (130 = Halconas 130 FC).
--   * Cruces Silver vs Gold: se cargan con la categoría del equipo LOCAL
--     (JL vs HM, CER vs AX, AZT vs GOL, OSO vs BR, BR vs GOL, AX vs AZT, MAL vs RUS).

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
    WHERE season_id = v_season AND jornada = 5 AND game_date = DATE '2026-10-18'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J5 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 5 AND game_date = DATE '2026-10-18';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-10-18', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', 'jornada', 5, 'regular', 'flag', 'regular',
    true, v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'Blue Axis FC',          'Aztecas B FCB'),
    ('08:00', 'Campo B', 'femenil-silver',   'Aztecas FS',            'Cobras Prime FS'),
    ('08:00', 'Campo C', 'femenil-cooper-b', 'Bufalos UIM FCB',       'Halconas Verdes FC'),
    ('08:00', 'Campo D', 'mixto-silver',     'BLUEHIDES MS',          'Rebels MS'),
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-b', 'Cobras Prime FC',       'Black Ravens B FCB'),
    ('09:00', 'Campo B', 'femenil-cooper-b', 'Halconas 130 FC',       'Osas E FC'),
    ('09:00', 'Campo C', 'femenil-silver',   'Cobras Prime FS',       'Osas B FS'),
    ('09:00', 'Campo D', 'femenil-silver',   'Tigres Blancos FS',     'Rebels FS'),
    -- 10:00
    ('10:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',               'Black Ravens A FCA'),
    ('10:00', 'Campo B', 'femenil-cooper-a', 'Osas C FC',             'Anti✦Hero FC'),
    ('10:00', 'Campo C', 'femenil-cooper-b', 'BLUEHIDES FC',          'Bufalos UIM FCB'),
    -- 11:00
    ('11:00', 'Campo A', 'femenil-cooper-b', 'Osas D FC',             'White Axis FC'),
    ('11:00', 'Campo B', 'femenil-silver',   'Osas A FS',             'Ponys 89 FS'),
    ('11:00', 'Campo C', 'mixto-silver',     'Anti✦Hero',             'Tlacuaches MS'),
    -- 12:00
    ('12:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',               'Anti✦Hero FC'),
    ('12:00', 'Campo B', 'mixto-gold',       'Justice League MG',     'Happy Monos MS'),
    ('12:00', 'Campo C', 'varonil-silver',   'Búfalos uim VS',        'Escorpiones VS'),
    -- 13:00
    ('13:00', 'Campo A', 'mixto-silver',     'Cerberus MS',           'Axis MG'),
    ('13:00', 'Campo B', 'femenil-cooper-a', 'Odonto FC',             'Aztecas FC'),
    ('13:00', 'Campo C', 'varonil-silver',   'Black Ravens',          'Goldens'),
    -- 14:00
    ('14:00', 'Campo A', 'mixto-silver',     'Aztecas MS',            'Goldens MG'),
    ('14:00', 'Campo B', 'mixto-silver',     'Osos MS',               'Black Ravens MG'),
    ('14:00', 'Campo C', 'mixto-silver',     'Anti✦Hero',             'Perritos Panzones MS'),
    -- 15:00
    ('15:00', 'Campo A', 'varonil-gold',     'Axis VG',               'Aztecas  VS'),
    ('15:00', 'Campo B', 'varonil-silver',   'Malosos ',              'RUST-EZE VG')
  ) AS r(hora, campo, categoria, home, away);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J5: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J5 (deben salir 25 partidos)
SELECT game_time, field, category, home_team, away_team, is_draft
FROM public.games
WHERE jornada = 5 AND game_date = DATE '2026-10-18'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 5 AND g.game_date = DATE '2026-10-18'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;

-- Verificación 3: partidos donde algún equipo es de otra categoría (cruces esperados: 7, más UIM vs HAL)
SELECT g.game_time, g.field, g.category AS categoria_partido,
       g.home_team, h.category AS cat_local,
       g.away_team, a.category AS cat_visita
FROM public.games g
JOIN public.teams h ON h.season_id = g.season_id AND h.name = g.home_team
JOIN public.teams a ON a.season_id = g.season_id AND a.name = g.away_team
WHERE g.jornada = 5 AND g.game_date = DATE '2026-10-18'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (h.category IS DISTINCT FROM g.category OR a.category IS DISTINCT FROM g.category)
ORDER BY g.game_time, g.field;
