-- Jornada 8 — Otoño 2026 (8 nov 2026, Deportivo Tapias)
-- Desde la imagen del rol J8 (abreviaturas + color de categoría). Campos A–D, 8:00 a 15:00.
-- Partidos publicados (is_draft = false).
-- Mixto y varonil van como mixto-libre / varonil-libre.
--
-- Negros = amistoso (no suman puntos):
--   8:00 B BR COPPER vs TB SILVER
--   9:00 C PON COPPER vs BAX
--   10:00 A AX cA vs ITS Silver
--   12:00 C AZT COPPER vs PON SILVER
--
-- REVISAR antes de correr:
--   * 8:00 B "BR COPPER" = Black Ravens B FCB. Si es el de Cooper A, cámbialo a Black Ravens A FCA.
--   * 12:00 B "OSC vs BR COOPER" sale naranja, pero OSC/BR son femenil.
--     Se carga como Cooper A: Osas C FC vs Black Ravens A FCA.
--   * 9:00 Campo B (130) y Campo D (HAL) en Cooper B son los dos Halconas 130 FC, misma hora.
--   * 12:00 D "UIM" no existe en mixto. Se usó Búfalos uim VS (también juega a las 14:00).
--   * 13:00 B "PP vs BR" sale rosa; PP y BR no están en Femenil Silver.
--     Se carga como mixto: Perritos Panzones MS vs Black Ravens MG.
--   * 13:00 C MAL es varonil y la celda es naranja: Axis MG, categoría mixto-libre.
--   * 10:00 D celda roja "CER vs BLU": Cerberus MS vs BLUEHIDES MS.
--   * 12:00 C "AZT COPPER" = Aztecas FC (Cooper A). "PON SILVER" = Ponys 89 FS.
-- No incluye 14:00 D "MAL vs MAC" ni 15:00 D "130 vs MAC" (MAC sigue sin confirmar).

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
    WHERE season_id = v_season AND jornada = 8 AND game_date = DATE '2026-11-08'
      AND status IN ('en_vivo', 'en vivo', 'finalizado')
  ) THEN
    RAISE EXCEPTION 'Hay partidos de J8 en vivo o finalizados; no se reemplaza nada';
  END IF;

  DELETE FROM public.games
  WHERE season_id = v_season AND jornada = 8 AND game_date = DATE '2026-11-08';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  )
  SELECT
    r.home, r.away, DATE '2026-11-08', r.hora::time, 'Deportivo Tapias', r.campo, r.categoria,
    'programado', r.match_type, 8, 'regular', 'flag', r.game_type,
    (r.game_type = 'regular'), v_season, v_year, false
  FROM (VALUES
    -- 8:00
    ('08:00', 'Campo A', 'femenil-cooper-a', 'Cobras Prime FC',      'Odonto FC',           'jornada',  'regular'),  -- COP vs ODO coop A (gris; COP es Cooper B)
    ('08:00', 'Campo B', 'femenil-cooper-b', 'Black Ravens B FCB',   'Tigres Blancos FS',   'amistoso', 'friendly'), -- BR COPPER vs TB SILVER
    ('08:00', 'Campo C', 'femenil-silver',   'Aztecas FS',           'Lobas ITES  FS',      'jornada',  'regular'),  -- AZT vs ITS
    ('08:00', 'Campo D', 'femenil-cooper-a', 'Anti✦Hero FC',         'Halconas 130 FC',     'jornada',  'regular'),  -- ANT coop A vs HAL coop B
    -- 9:00
    ('09:00', 'Campo A', 'femenil-cooper-b', 'Mini Axis FC',         'BLUEHIDES FC',        'jornada',  'regular'),  -- MAX vs BLU
    ('09:00', 'Campo B', 'femenil-cooper-b', 'Halconas 130 FC',      'Osas D FC',           'jornada',  'regular'),  -- 130 vs OSD
    ('09:00', 'Campo C', 'femenil-cooper-a', 'Ponys 89 A FC',        'Blue Axis FC',        'amistoso', 'friendly'), -- PON COPPER vs BAX
    ('09:00', 'Campo D', 'femenil-cooper-b', 'Aztecas B FCB',        'Halconas 130 FC',     'jornada',  'regular'),  -- AZT vs HAL
    -- 10:00
    ('10:00', 'Campo A', 'femenil-cooper-a', 'Axis FC',              'Lobas ITES  FS',      'amistoso', 'friendly'), -- AX cA vs ITS Silver
    ('10:00', 'Campo B', 'femenil-cooper-b', 'Osas E FC',            'Bufalos UIM FCB',     'jornada',  'regular'),  -- OSE vs UIM
    ('10:00', 'Campo C', 'mixto-libre',      'Anti✦Hero',            'Rebels MS',           'jornada',  'regular'),  -- ANT vs REB
    ('10:00', 'Campo D', 'mixto-libre',      'Cerberus MS',          'BLUEHIDES MS',        'jornada',  'regular'),  -- CER vs BLU (celda roja)
    -- 11:00
    ('11:00', 'Campo A', 'femenil-silver',   'Osas A FS',            'Lobas ITES  FS',      'jornada',  'regular'),  -- OSA vs ITS
    ('11:00', 'Campo B', 'femenil-cooper-b', 'Osas D FC',            'Bufalos UIM FCB',     'jornada',  'regular'),  -- OSD vs UIM
    -- 12:00
    ('12:00', 'Campo A', 'mixto-libre',      'Halcones 130 MS',      'Axis MG',             'jornada',  'regular'),  -- 130 vs AX
    ('12:00', 'Campo B', 'femenil-cooper-a', 'Osas C FC',            'Black Ravens A FCA',  'jornada',  'regular'),  -- OSC vs BR COOPER (celda naranja)
    ('12:00', 'Campo C', 'femenil-cooper-a', 'Aztecas FC',           'Ponys 89 FS',         'amistoso', 'friendly'), -- AZT COPPER vs PON SILVER
    ('12:00', 'Campo D', 'mixto-libre',      'Pumas el salto  MS',   'Búfalos uim VS',      'jornada',  'regular'),  -- PUM vs UIM (UIM no es mixto)
    -- 13:00
    ('13:00', 'Campo A', 'femenil-silver',   'Aztecas FS',           'Osas B FS',           'jornada',  'regular'),  -- AZT vs OSB
    ('13:00', 'Campo B', 'mixto-libre',      'Perritos Panzones MS', 'Black Ravens MG',     'jornada',  'regular'),  -- PP vs BR (celda rosa)
    ('13:00', 'Campo C', 'mixto-libre',      'Malosos ',             'Axis MG',             'jornada',  'regular'),  -- MAL vs AX (MAL es varonil)
    -- 14:00  (sin Campo D: MAL vs MAC)
    ('14:00', 'Campo A', 'varonil-libre',    'Búfalos uim VS',       'Black Ravens',        'jornada',  'regular'),  -- UIM vs BR
    ('14:00', 'Campo B', 'mixto-libre',      'Pumas el salto  MS',   'Goldens MG',          'jornada',  'regular'),  -- PUM vs GOL
    ('14:00', 'Campo C', 'mixto-libre',      'Osos MS',              'Justice League MG',   'jornada',  'regular'),  -- OSO vs JL
    -- 15:00  (sin Campo D: 130 vs MAC)
    ('15:00', 'Campo A', 'mixto-libre',      'Pumas el salto  MS',   'Tlacuaches MS',       'jornada',  'regular'),  -- PUM vs TLA
    ('15:00', 'Campo B', 'varonil-libre',    'Aztecas  VS',          'Goldens',             'jornada',  'regular'),  -- AZT vs GOL
    ('15:00', 'Campo C', 'varonil-libre',    'Escorpiones VS',       'RUST-EZE VG',         'jornada',  'regular')   -- ESC vs RUS
  ) AS r(hora, campo, categoria, home, away, match_type, game_type);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RAISE NOTICE 'J8: % partidos borrados, % insertados (publicados)', v_deleted, v_inserted;
END $$;

-- Verificación 1: rol de J8 (deben salir 27 partidos; 4 amistosos)
SELECT game_time, field, category, home_team, away_team, match_type, game_type, counts_for_standings
FROM public.games
WHERE jornada = 8 AND game_date = DATE '2026-11-08'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
ORDER BY game_time, field;

-- Verificación 2: equipos que NO existen en la temporada activa (debe salir vacío)
SELECT g.game_time, g.field, g.category, g.home_team, g.away_team
FROM public.games g
WHERE g.jornada = 8 AND g.game_date = DATE '2026-11-08'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;

-- Verificación 3: partidos OFICIALES donde algún equipo es de otra categoría (amistosos se omiten)
-- Esperados: COP vs ODO, ANT vs HAL, PUM vs UIM, MAL vs AX.
SELECT g.game_time, g.field, g.category AS categoria_partido,
       g.home_team, h.category AS cat_local,
       g.away_team, a.category AS cat_visita
FROM public.games g
JOIN public.teams h ON h.season_id = g.season_id AND h.name = g.home_team
JOIN public.teams a ON a.season_id = g.season_id AND a.name = g.away_team
WHERE g.jornada = 8 AND g.game_date = DATE '2026-11-08'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
  AND g.match_type IS DISTINCT FROM 'amistoso'
  AND (h.category IS DISTINCT FROM g.category OR a.category IS DISTINCT FROM g.category)
ORDER BY g.game_time, g.field;

-- Verificación 4: mismo equipo en dos campos a la misma hora (debe salir Halconas 130 FC a las 9:00)
SELECT g.game_time, t.name AS equipo, string_agg(g.field || ': ' || g.home_team || ' vs ' || g.away_team, ' | ' ORDER BY g.field) AS partidos
FROM public.games g
JOIN public.teams t ON t.season_id = g.season_id AND (t.name = g.home_team OR t.name = g.away_team)
WHERE g.jornada = 8 AND g.game_date = DATE '2026-11-08'
  AND g.season_id = (SELECT id FROM public.seasons WHERE is_active LIMIT 1)
GROUP BY g.game_time, t.name
HAVING count(*) > 1
ORDER BY g.game_time, t.name;
