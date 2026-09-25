-- Partidos Jornada 2 â€” OtoÃ±o 2026 (27 sep 2026) Deportivo Tapias
-- Generado desde: OtoÃ±o 2026 (1).xlsx hoja J2
-- Revisa nombres vs teams de la temporada activa antes de ejecutar.
-- is_draft = true â†’ publicar desde Admin > Generador cuando estÃ© listo.

DO $$
DECLARE
  v_season uuid;
  v_year integer;
BEGIN
  SELECT id, year INTO v_season, v_year FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No hay temporada activa';
  END IF;

  -- Evitar duplicar si ya corriste este script
  DELETE FROM public.games
  WHERE season_id = v_season
    AND jornada = 2
    AND game_date::date = DATE '2026-09-27';

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Blue Axis', 'BlueHidess', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo A', 'femenil-cooper-b',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Mini Axis', 'Osas D', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo B', 'femenil-cooper-b',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Ponys A', 'Lobas ITS', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo C', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Halconas 130', 'Black Ravens', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo D', 'femenil-cooper-b',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Osas E', 'Bufalos UIM', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo E', 'femenil-cooper-b',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Osas B', 'ITD', DATE '2026-09-27', '08:00',
    'Deportivo Tapias', 'Campo F', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Axis', 'Osas C', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo A', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Hellcats', 'Rebels', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo B', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Tigres Blancos', 'Quetzas FADER', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo C', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Aztecas', 'BlueHidess', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo D', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Osas A', 'Ducks', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo E', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Leonas', 'Halconas Dgo', DATE '2026-09-27', '09:00',
    'Deportivo Tapias', 'Campo F', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Ducks', 'Lobas UAD', DATE '2026-09-27', '10:00',
    'Deportivo Tapias', 'Campo A', 'femenil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'ITD', 'Black Ravens', DATE '2026-09-27', '10:00',
    'Deportivo Tapias', 'Campo B', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Hellcats', 'Lobas ITS', DATE '2026-09-27', '10:00',
    'Deportivo Tapias', 'Campo C', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Ponys', 'Aztecas', DATE '2026-09-27', '10:00',
    'Deportivo Tapias', 'Campo D', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Anti-Hero', 'Odonto', DATE '2026-09-27', '10:00',
    'Deportivo Tapias', 'Campo E', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Tigres Blancos', 'Lobas ITS', DATE '2026-09-27', '11:00',
    'Deportivo Tapias', 'Campo A', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'ITD', 'Halconas Dgo', DATE '2026-09-27', '11:00',
    'Deportivo Tapias', 'Campo B', 'femenil-cooper-a',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Thunders', 'Bufalos UTD', DATE '2026-09-27', '11:00',
    'Deportivo Tapias', 'Campo C', 'varonil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Osas B', 'Ducks', DATE '2026-09-27', '11:00',
    'Deportivo Tapias', 'Campo D', 'femenil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Thunders', 'DSM BBYS', DATE '2026-09-27', '11:00',
    'Deportivo Tapias', 'Campo E', 'femenil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Osos', 'Axis Blancos', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo A', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Anti-Hero', 'Bufalos UTD', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo B', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Perritos Panzones', 'Tlacuaches', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo C', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'DSM OLDIES', 'BlackReavens', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo D', 'femenil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Leones', 'Prime', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo E', 'mixto-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Aztecas', 'Escorpiones', DATE '2026-09-27', '12:00',
    'Deportivo Tapias', 'Campo F', 'varonil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Axis', 'Justice League', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo A', 'mixto-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Goldens', 'Ducks', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo B', 'mixto-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Rebels', 'Pumas', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo C', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Black Reavens', 'ITD', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo D', 'mixto-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Happy Monos', 'ITD', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo E', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Halcones 130', 'Cerberus', DATE '2026-09-27', '13:00',
    'Deportivo Tapias', 'Campo F', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Black Reavens', 'Perritos Panzones', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo A', 'varonil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Goldens', 'ITD', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo B', 'varonil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Anti-Hero', 'Pumas', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo C', 'mixto-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Halcones 130', 'Rockerts', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo D', 'varonil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Ducks N', 'Lobos UAD', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo E', 'varonil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Bufalos UIM', 'Escorpiones', DATE '2026-09-27', '14:00',
    'Deportivo Tapias', 'Campo F', 'varonil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'ITD', 'Axis', DATE '2026-09-27', '15:00',
    'Deportivo Tapias', 'Campo A', 'varonil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Rust-Eze', 'Ducks M', DATE '2026-09-27', '15:00',
    'Deportivo Tapias', 'Campo B', 'varonil-gold',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  INSERT INTO public.games (
    home_team, away_team, game_date, game_time, venue, field, category,
    status, match_type, jornada, stage, sport_type, game_type,
    counts_for_standings, season_id, season, is_draft
  ) VALUES (
    'Malosos', 'Leones', DATE '2026-09-27', '15:00',
    'Deportivo Tapias', 'Campo C', 'varonil-silver',
    'programado', 'jornada', 2, 'regular', 'flag', 'regular',
    true, v_season, v_year, true
  );

  RAISE NOTICE 'Insertados % partidos J2 (draft)', 43;
END $$;

-- VerificaciÃ³n:
-- SELECT id, game_time, field, home_team, away_team, category, is_draft
-- FROM games WHERE jornada=2 AND game_date::date='2026-09-27' ORDER BY game_time, field;
