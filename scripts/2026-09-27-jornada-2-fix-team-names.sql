-- Corrige nombres de partidos J2 (draft 2026-09-27) contra equipos de la temporada activa.
-- 1) Ejecuta esto en Supabase.
-- 2) Revisa el SELECT de verificaciÃ³n al final.
-- 3) Publica desde Admin > Generador / Partidos.

DO $$
DECLARE
  v_season uuid;
BEGIN
  SELECT id INTO v_season FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No hay temporada activa';
  END IF;

  -- Asegurar que los drafts J2 apunten a la temporada activa
  UPDATE public.games
  SET season_id = v_season,
      season = (SELECT year FROM public.seasons WHERE id = v_season)
  WHERE jornada = 2
    AND game_date = DATE '2026-09-27'
    AND (season_id IS DISTINCT FROM v_season OR season_id IS NULL);

  -- Remapear home_team / away_team al nombre real del roster activo (misma categorÃ­a)
  UPDATE public.games g
  SET home_team = COALESCE((
        SELECT t.name
        FROM public.teams t
        WHERE t.season_id = v_season
          AND t.category = g.category
          AND (
            lower(trim(t.name)) = lower(trim(g.home_team))
            OR lower(t.name) LIKE '%' || lower(trim(g.home_team)) || '%'
            OR lower(trim(g.home_team)) LIKE '%' || lower(t.name) || '%'
            OR replace(lower(t.name), ' ', '') = replace(lower(g.home_team), ' ', '')
          )
        ORDER BY
          CASE WHEN lower(trim(t.name)) = lower(trim(g.home_team)) THEN 0 ELSE 1 END,
          length(t.name)
        LIMIT 1
      ), g.home_team),
      away_team = COALESCE((
        SELECT t.name
        FROM public.teams t
        WHERE t.season_id = v_season
          AND t.category = g.category
          AND (
            lower(trim(t.name)) = lower(trim(g.away_team))
            OR lower(t.name) LIKE '%' || lower(trim(g.away_team)) || '%'
            OR lower(trim(g.away_team)) LIKE '%' || lower(t.name) || '%'
            OR replace(lower(t.name), ' ', '') = replace(lower(g.away_team), ' ', '')
          )
        ORDER BY
          CASE WHEN lower(trim(t.name)) = lower(trim(g.away_team)) THEN 0 ELSE 1 END,
          length(t.name)
        LIMIT 1
      ), g.away_team)
  WHERE g.jornada = 2
    AND g.game_date = DATE '2026-09-27'
    AND g.season_id = v_season;
END $$;

-- Alias manuales frecuentes (Excel -> nombres tÃ­picos Flag Durango)
-- Solo aplica si aÃºn no matcheÃ³ exacto.
DO $$
DECLARE
  v_season uuid;
BEGIN
  SELECT id INTO v_season FROM public.seasons WHERE is_active = true LIMIT 1;

  -- Mapa de correcciones explÃ­citas (ajusta si hace falta)
  UPDATE public.games g SET home_team = x.new_name
  FROM (VALUES
    ('BlueHidess', 'BlueHidess'),
    ('Blue Hidess', 'BlueHidess'),
    ('BlackReavens', 'Black Ravens'),
    ('Black Reavens', 'Black Ravens'),
    ('Halconas Dgo', 'Halconas Dgo'),
    ('Halconas Durango', 'Halconas Dgo'),
    ('Bufalos UIM', 'Bufalos UIM'),
    ('BÃºfalos UIM', 'Bufalos UIM'),
    ('Bufalos UTD', 'Bufalos UTD'),
    ('Quetzas FADER', 'Quetzas FADER'),
    ('DSM BBYS', 'DSM BBYS'),
    ('DSM OLDIES', 'DSM OLDIES'),
    ('Justice League', 'Justice League'),
    ('Perritos Panzones', 'Perritos Panzones'),
    ('Happy Monos', 'Happy Monos'),
    ('Rust-Eze', 'Rust-Eze'),
    ('Ducks M', 'Ducks M'),
    ('Ducks N', 'Ducks N'),
    ('Axis Blancos', 'Axis Blancos'),
    ('Axis Blancas', 'Axis Blancas'),
    ('Mini Axis', 'Mini Axis'),
    ('Blue Axis', 'Blue Axis'),
    ('Anti-Hero', 'Anti-Hero'),
    ('Anti-Heros', 'Anti-Hero'),
    ('Odonto', 'Odonto'),
    ('Osas A', 'Osas A'),
    ('Osas B', 'Osas B'),
    ('Osas C', 'Osas C'),
    ('Osas D', 'Osas D'),
    ('Osas E', 'Osas E'),
    ('Ponys A', 'Ponys A'),
    ('Ponys B', 'Ponys B'),
    ('Lobas ITS', 'Lobas ITS'),
    ('Lobas UAD', 'Lobas UAD'),
    ('Lobos UAD', 'Lobos UAD'),
    ('Tigres Blancos', 'Tigres Blancos'),
    ('Halcones 130', 'Halcones 130'),
    ('Halconas 130', 'Halconas 130'),
    ('Rockerts', 'Rockerts'),
    ('Malosos', 'Malosos'),
    ('Escorpiones', 'Escorpiones'),
    ('Tlacuaches', 'Tlacuaches'),
    ('Cerberus', 'Cerberus'),
    ('Goldens', 'Goldens'),
    ('Prime', 'Prime'),
    ('Thunders', 'Thunders'),
    ('Leonas', 'Leonas'),
    ('Leones', 'Leones'),
    ('Ducks', 'Ducks'),
    ('ITD', 'ITD'),
    ('Axis', 'Axis'),
    ('Aztecas', 'Aztecas'),
    ('Rebels', 'Rebels'),
    ('Pumas', 'Pumas'),
    ('Osos', 'Osos'),
    ('Cobras', 'Cobras'),
    ('Hellcats', 'Hellcats'),
    ('Ponys', 'Ponys'),
    ('Black Ravens', 'Black Ravens')
  ) AS x(old_name, new_name)
  WHERE g.season_id = v_season
    AND g.jornada = 2
    AND g.game_date = DATE '2026-09-27'
    AND lower(trim(g.home_team)) = lower(trim(x.old_name))
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.season_id = v_season
        AND t.category = g.category
        AND lower(trim(t.name)) = lower(trim(x.new_name))
    );

  UPDATE public.games g SET away_team = x.new_name
  FROM (VALUES
    ('BlueHidess', 'BlueHidess'),
    ('Blue Hidess', 'BlueHidess'),
    ('BlackReavens', 'Black Ravens'),
    ('Black Reavens', 'Black Ravens'),
    ('Halconas Dgo', 'Halconas Dgo'),
    ('Halconas Durango', 'Halconas Dgo'),
    ('Bufalos UIM', 'Bufalos UIM'),
    ('BÃºfalos UIM', 'Bufalos UIM'),
    ('Bufalos UTD', 'Bufalos UTD'),
    ('Quetzas FADER', 'Quetzas FADER'),
    ('DSM BBYS', 'DSM BBYS'),
    ('DSM OLDIES', 'DSM OLDIES'),
    ('Justice League', 'Justice League'),
    ('Perritos Panzones', 'Perritos Panzones'),
    ('Happy Monos', 'Happy Monos'),
    ('Rust-Eze', 'Rust-Eze'),
    ('Ducks M', 'Ducks M'),
    ('Ducks N', 'Ducks N'),
    ('Axis Blancos', 'Axis Blancos'),
    ('Axis Blancas', 'Axis Blancas'),
    ('Mini Axis', 'Mini Axis'),
    ('Blue Axis', 'Blue Axis'),
    ('Anti-Hero', 'Anti-Hero'),
    ('Anti-Heros', 'Anti-Hero'),
    ('Odonto', 'Odonto'),
    ('Osas A', 'Osas A'),
    ('Osas B', 'Osas B'),
    ('Osas C', 'Osas C'),
    ('Osas D', 'Osas D'),
    ('Osas E', 'Osas E'),
    ('Ponys A', 'Ponys A'),
    ('Ponys B', 'Ponys B'),
    ('Lobas ITS', 'Lobas ITS'),
    ('Lobas UAD', 'Lobas UAD'),
    ('Lobos UAD', 'Lobos UAD'),
    ('Tigres Blancos', 'Tigres Blancos'),
    ('Halcones 130', 'Halcones 130'),
    ('Halconas 130', 'Halconas 130'),
    ('Rockerts', 'Rockerts'),
    ('Malosos', 'Malosos'),
    ('Escorpiones', 'Escorpiones'),
    ('Tlacuaches', 'Tlacuaches'),
    ('Cerberus', 'Cerberus'),
    ('Goldens', 'Goldens'),
    ('Prime', 'Prime'),
    ('Thunders', 'Thunders'),
    ('Leonas', 'Leonas'),
    ('Leones', 'Leones'),
    ('Ducks', 'Ducks'),
    ('ITD', 'ITD'),
    ('Axis', 'Axis'),
    ('Aztecas', 'Aztecas'),
    ('Rebels', 'Rebels'),
    ('Pumas', 'Pumas'),
    ('Osos', 'Osos'),
    ('Cobras', 'Cobras'),
    ('Hellcats', 'Hellcats'),
    ('Ponys', 'Ponys'),
    ('Black Ravens', 'Black Ravens')
  ) AS x(old_name, new_name)
  WHERE g.season_id = v_season
    AND g.jornada = 2
    AND g.game_date = DATE '2026-09-27'
    AND lower(trim(g.away_team)) = lower(trim(x.old_name))
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.season_id = v_season
        AND t.category = g.category
        AND lower(trim(t.name)) = lower(trim(x.new_name))
    );
END $$;

-- Ver quÃ© quedÃ³ sin match (equipo no existe en temporada activa + categorÃ­a)
SELECT
  g.id,
  g.game_time,
  g.field,
  g.category,
  g.home_team,
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.season_id = g.season_id AND t.category = g.category AND t.name = g.home_team
  ) AS home_ok,
  g.away_team,
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.season_id = g.season_id AND t.category = g.category AND t.name = g.away_team
  ) AS away_ok
FROM games g
JOIN seasons s ON s.id = g.season_id AND s.is_active = true
WHERE g.jornada = 2
  AND g.game_date = DATE '2026-09-27'
  ORDER BY g.game_time, g.field;

-- Lista de equipos activos por categorÃ­a (para corregir a mano los que fallen)
SELECT category, name
FROM teams
WHERE season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
ORDER BY category, name;

