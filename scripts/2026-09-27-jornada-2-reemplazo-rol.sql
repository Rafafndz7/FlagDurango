-- Jornada 2 — Otoño 2026 (27 sep 2026, Deportivo Tapias)
-- REEMPLAZA el rol de J2 por el de "Otoño 2026 (3).xlsx" hoja "Copia de J2".
-- Partidos publicados directamente (is_draft = false).
-- Solo Campos A–D. Todo lo de "SE POSPONE" (columnas J–M) queda fuera.
-- Descansa: Aztecas Cooper B.

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
    WHERE season_id = v_season AND jornada = 2 AND game_date = DATE '2026-09-27'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J2 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 2 AND game_date = DATE '2026-09-27';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-09-27', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'Blue Axis FC',        'BLUEHIDES FC'),
    ('08:00', 'Campo B', 'femenil-cooper-b', 'Mini Axis FC',        'Osas D FC'),
    ('08:00', 'Campo C', 'femenil-silver',   'Ponys 89 FS',         'Lobas ITES  FS'),
    ('08:00', 'Campo D', 'femenil-cooper-b', 'Halconas 130 FC',     'Black Ravens B FCB'),
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',             'Osas C FC'),
    ('09:00', 'Campo B', 'femenil-silver',   'Hellcats  FS',        'Rebels FS'),
    ('09:00', 'Campo C', 'femenil-silver',   'Tigres Blancos FS',   'Quetzas  FS'),
    ('09:00', 'Campo D', 'mixto-silver',     'Aztecas MS',          'BLUEHIDES MS'),
    -- 10:00
    ('10:00', 'Campo A', 'femenil-cooper-a', 'Halconas Verdes FC',  'Black Ravens A FCA'),
    ('10:00', 'Campo B', 'femenil-cooper-a', 'Anti✦Hero FC',        'Odonto FC'),
    ('10:00', 'Campo C', 'femenil-silver',   'Hellcats  FS',        'Lobas ITES  FS'),
    ('10:00', 'Campo D', 'femenil-silver',   'Osas A FS',           'Osas B FS'),
    -- 11:00
    ('11:00', 'Campo A', 'femenil-silver',   'Tigres Blancos FS',   'Lobas ITES  FS'),
    ('11:00', 'Campo B', 'mixto-silver',     'Perritos Panzones MS','Tlacuaches MS'),
    ('11:00', 'Campo C', 'mixto-silver',     'Anti✦Hero',           'White Axis MS'),
    ('11:00', 'Campo D', 'femenil-cooper-a', 'Ponys 89 A FC',       'Aztecas FC'),
    -- 12:00
    ('12:00', 'Campo A', 'mixto-silver',     'Osos MS',             'White Axis MS'),
    ('12:00', 'Campo C', 'femenil-gold',     'DSM OLDIES FG',       'Black Ravens  FG'),
    -- 13:00
    ('13:00', 'Campo A', 'mixto-gold',       'Axis MG',             'Justice League MG'),
    ('13:00', 'Campo B', 'varonil-silver',   'Aztecas  VS',         'Escorpiones VS'),
    ('13:00', 'Campo C', 'mixto-silver',     'Rebels MS',           'Pumas el salto  MS'),
    ('13:00', 'Campo D', 'mixto-silver',     'Halcones 130 MS',     'Cerberus MS'),
    -- 14:00
    ('14:00', 'Campo A', 'varonil-silver',   'Black Ravens',        'Perritos Panzones VS'),
    ('14:00', 'Campo B', 'mixto-silver',     'Anti✦Hero',           'Pumas el salto  MS'),
    ('14:00', 'Campo C', 'varonil-silver',   'Halcones 130 VS',     'Rockets VG')
  ) AS r(hora, campo, categoria, home, away);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J2 reemplazada: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol final de J2
SELECT game_time, field, category, home_team, away_team, is_draft
FROM public.games
WHERE jornada = 2 AND game_date = DATE '2026-09-27'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos del rol que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 2 AND g.game_date = DATE '2026-09-27'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;
