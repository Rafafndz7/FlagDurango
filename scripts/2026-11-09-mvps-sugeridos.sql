-- MVPs sugeridos de la temporada activa, a partir de player_game_stats.
-- Solo lectura: no cambia nada. Devuelve el top 3 de cada partido y el top 3
-- de cada jornada + categoría (jugador de la semana).
--
-- Puntos (igual que lib/mvp-suggestions.ts):
--   TD anotado (recepción, carrera o intercepción) 6 · TD de pase 4 · INT 5 · sack 3
--   pase defendido 2 · pase completo, recepción, bandera y punto extra 1
--   INT lanzada -3 · 1 punto por cada 20 yardas · +3 si su equipo ganó
--
-- Para ver una sola jornada, cambia NULL por el número en "filtro".

WITH filtro AS (
  SELECT NULL::int AS jornada
),
juegos AS (
  SELECT g.*
  FROM public.games g
  JOIN public.seasons s ON s.id = g.season_id AND s.is_active
  CROSS JOIN filtro f
  WHERE f.jornada IS NULL OR g.jornada = f.jornada
),
lineas AS (
  SELECT
    g.id AS game_id, g.jornada, g.category,
    g.home_team || ' ' || coalesce(g.home_score::text, '-') || '-' || coalesce(g.away_score::text, '-') || ' ' || g.away_team AS partido,
    p.id AS player_id,
    coalesce('#' || p.jersey_number || ' ', '') || p.name AS jugador,
    t.name AS equipo,
    coalesce(st.touchdowns_recepcion, 0) + coalesce(st.touchdowns_carrera, 0) + coalesce(st.touchdowns_intercepcion, 0) AS td,
    coalesce(st.touchdowns_pase, 0) AS td_pase,
    coalesce(st.pases_completos, 0) AS pc,
    coalesce(st.recepciones, 0) AS rec,
    coalesce(st.intercepciones, 0) AS int_,
    coalesce(st.sacks, 0) AS sacks,
    coalesce(st.pases_defendidos, 0) AS pd,
    coalesce(st.banderas_jaladas, 0) AS band,
    coalesce(st.puntos_extra, 0) AS px,
    coalesce(st.intercepciones_lanzadas, 0) AS int_lanz,
    coalesce(st.yardas_pase, 0) + coalesce(st.yardas_carrera, 0) + coalesce(st.yardas_recepcion, 0) + coalesce(st.yardas_intercepcion, 0) AS yardas,
    (g.home_score IS DISTINCT FROM g.away_score AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL AND
      btrim(t.name) = btrim(CASE WHEN g.home_score > g.away_score THEN g.home_team ELSE g.away_team END)) AS gano
  FROM juegos g
  JOIN public.player_game_stats st ON st.game_id = g.id
  JOIN public.players p ON p.id = st.player_id
  LEFT JOIN public.teams t ON t.id = st.team_id
),
puntaje AS (
  SELECT l.*,
    6 * td + 4 * td_pase + pc + rec + 5 * int_ + 3 * sacks + 2 * pd + band + px - 3 * int_lanz
      + floor(yardas / 20.0)::int + CASE WHEN gano THEN 3 ELSE 0 END AS puntos
  FROM lineas l
),
por_partido AS (
  SELECT 'MVP de partido' AS tipo, jornada, category AS categoria, partido, jugador, equipo, puntos,
    concat_ws(' · ',
      nullif(td || ' TD', '0 TD'), nullif(td_pase || ' TD pase', '0 TD pase'), nullif(pc || ' PC', '0 PC'),
      nullif(rec || ' REC', '0 REC'), nullif(int_ || ' INT', '0 INT'), nullif(sacks || ' SACK', '0 SACK'),
      nullif(pd || ' PD', '0 PD'), nullif(band || ' BAND', '0 BAND')) AS detalle,
    row_number() OVER (PARTITION BY game_id ORDER BY puntos DESC, jugador) AS lugar
  FROM puntaje
  WHERE puntos > 0
),
semana AS (
  SELECT jornada, category, player_id, max(jugador) AS jugador, max(equipo) AS equipo,
    sum(puntos)::int AS puntos, count(*) AS partidos,
    sum(td) AS td, sum(td_pase) AS td_pase, sum(pc) AS pc, sum(rec) AS rec, sum(int_) AS int_,
    sum(sacks) AS sacks, sum(pd) AS pd, sum(band) AS band
  FROM puntaje
  WHERE puntos > 0 AND jornada IS NOT NULL AND category IS NOT NULL
  GROUP BY jornada, category, player_id
),
por_semana AS (
  SELECT 'Jugador de la semana' AS tipo, jornada, category AS categoria,
    partidos || ' partido(s)' AS partido, jugador, equipo, puntos,
    concat_ws(' · ',
      nullif(td || ' TD', '0 TD'), nullif(td_pase || ' TD pase', '0 TD pase'), nullif(pc || ' PC', '0 PC'),
      nullif(rec || ' REC', '0 REC'), nullif(int_ || ' INT', '0 INT'), nullif(sacks || ' SACK', '0 SACK'),
      nullif(pd || ' PD', '0 PD'), nullif(band || ' BAND', '0 BAND')) AS detalle,
    row_number() OVER (PARTITION BY jornada, category ORDER BY puntos DESC, jugador) AS lugar
  FROM semana
)
SELECT tipo, jornada, categoria, partido, lugar, jugador, equipo, puntos, detalle
FROM (
  SELECT * FROM por_semana WHERE lugar <= 3
  UNION ALL
  SELECT * FROM por_partido WHERE lugar <= 3
) x
ORDER BY jornada DESC NULLS LAST, categoria,
  CASE WHEN tipo = 'Jugador de la semana' THEN 0 ELSE 1 END,
  partido, lugar;
