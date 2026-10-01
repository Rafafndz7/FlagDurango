-- Jornada 3 — Otoño 2026 (4 oct 2026, Polideportivo Mario Vázquez Raña)
-- Desde "Otoño 2026 (4).xlsx" hoja J3. Campos A–E.
-- Partidos publicados directamente (is_draft = false).
-- No incluye "SE POSPONE": ITS vs FAD, COP vs AZT, OSE vs UIM, ANT vs PUM, PP vs PUM, UIM vs ESC.

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
    WHERE season_id = v_season AND jornada = 3 AND game_date = DATE '2026-10-04'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J3 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 3 AND game_date = DATE '2026-10-04';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-10-04', r.hora::time, 'Polideportivo Mario Vázquez Raña', r.campo, r.categoria,
    'programado', 'jornada', 3, 'regular', 'flag', 'regular',
    true, v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-b', 'Mini Axis FC',         'Bufalos UIM FCB'),
    ('08:00', 'Campo B', 'femenil-cooper-b', 'White Axis FC',        'Cobras Prime FC'),
    ('08:00', 'Campo C', 'femenil-cooper-b', 'Osas D FC',            'BLUEHIDES FC'),
    ('08:00', 'Campo D', 'femenil-cooper-b', 'Black Ravens B FCB',   'Aztecas B FCB'),
    ('08:00', 'Campo E', 'femenil-cooper-b', 'Halconas 130 FC',      'Halconas Verdes FC'),
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',              'Ponys 89 A FC'),
    ('09:00', 'Campo B', 'femenil-silver',   'Cobras Prime FS',      'Osas A FS'),
    ('09:00', 'Campo C', 'mixto-silver',     'White Axis MS',        'BLUEHIDES MS'),
    ('09:00', 'Campo D', 'femenil-cooper-a', 'Black Ravens A FCA',   'Odonto FC'),
    ('09:00', 'Campo E', 'femenil-cooper-a', 'Aztecas FC',           'Osas C FC'),
    -- 10:00
    ('10:00', 'Campo A', 'femenil-silver',   'Rebels FS',            'Ponys 89 FS'),
    ('10:00', 'Campo B', 'femenil-cooper-b', 'Blue Axis FC',         'Cobras Prime FC'),
    ('10:00', 'Campo C', 'femenil-silver',   'Aztecas FS',           'Hellcats  FS'),
    -- 11:00
    ('11:00', 'Campo A', 'femenil-cooper-b', 'Osas C FC',            'White Axis FC'),
    ('11:00', 'Campo B', 'femenil-silver',   'Tigres Blancos FS',    'Osas B FS'),
    ('11:00', 'Campo C', 'femenil-cooper-b', 'Halconas 130 FC',      'Bufalos UIM FCB'),
    -- 12:00
    ('12:00', 'Campo A', 'mixto-gold',       'Axis MG',              'Black Ravens MG'),
    ('12:00', 'Campo B', 'mixto-silver',     'Halcones 130 MS',      'Tlacuaches MS'),
    ('12:00', 'Campo C', 'mixto-silver',     'Rebels MS',            'Osos MS'),
    -- 13:00
    ('13:00', 'Campo A', 'mixto-gold',       'Justice League MG',    'Goldens MG'),
    ('13:00', 'Campo B', 'mixto-silver',     'Aztecas MS',           'Happy Monos MS'),
    ('13:00', 'Campo C', 'mixto-silver',     'Cerberus MS',          'Perritos Panzones MS'),
    ('13:00', 'Campo D', 'femenil-gold',     'Black Ravens  FG',     'DSM BBYS FG'),
    -- 14:00
    ('14:00', 'Campo A', 'varonil-silver',   'Rockets VG',           'Aztecas  VS'),
    ('14:00', 'Campo B', 'varonil-silver',   'Black Ravens',         'Malosos '),
    ('14:00', 'Campo C', 'varonil-silver',   'Escorpiones VS',       'Perritos Panzones VS'),
    ('14:00', 'Campo D', 'varonil-gold',     'Goldens',              'RUST-EZE VG')
  ) AS r(hora, campo, categoria, home, away);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J3: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J3
SELECT game_time, field, category, home_team, away_team, is_draft
FROM public.games
WHERE jornada = 3 AND game_date = DATE '2026-10-04'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 3 AND g.game_date = DATE '2026-10-04'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;
