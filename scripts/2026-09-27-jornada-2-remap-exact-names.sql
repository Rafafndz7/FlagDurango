-- Remapeo J2 a nombres EXACTOS de temporada activa (lista del admin)
-- Ejecutar en Supabase. Funciona aunque ya estén publicados.

DO $$
DECLARE
  v_season uuid;
BEGIN
  SELECT id INTO v_season FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'No hay temporada activa';
  END IF;

  UPDATE public.games SET season_id = v_season
  WHERE jornada = 2 AND game_date = DATE '2026-09-27'
    AND (season_id IS DISTINCT FROM v_season OR season_id IS NULL);

  -- ========== FEMENIL COOPER A ==========
  UPDATE public.games SET home_team = 'Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Axis','AX','Axis FC');
  UPDATE public.games SET away_team = 'Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Axis','AX','Axis FC');
  UPDATE public.games SET home_team = 'Odonto FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Odonto','ODO','Odonto FC');
  UPDATE public.games SET away_team = 'Odonto FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Odonto','ODO','Odonto FC');
  UPDATE public.games SET home_team = 'Leonas FC FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Leonas','LEO','Leonas FC','Leonas FC FC');
  UPDATE public.games SET away_team = 'Leonas FC FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Leonas','LEO','Leonas FC','Leonas FC FC');
  UPDATE public.games SET home_team = 'Anti✦Hero FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Anti-Hero','Anti-Heros','ANT','Anti✦Hero FC');
  UPDATE public.games SET away_team = 'Anti✦Hero FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Anti-Hero','Anti-Heros','ANT','Anti✦Hero FC');
  UPDATE public.games SET home_team = 'Osas C FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Osas C','OSC','Osas C FC');
  UPDATE public.games SET away_team = 'Osas C FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Osas C','OSC','Osas C FC');
  UPDATE public.games SET home_team = 'BURRAS BLANCAS FCA' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('ITD','BURRAS BLANCAS FCA','Burras Blancas');
  UPDATE public.games SET away_team = 'BURRAS BLANCAS FCA' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('ITD','BURRAS BLANCAS FCA','Burras Blancas');
  UPDATE public.games SET home_team = 'Ponys 89 A FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Ponys','PON','Ponys 89 A FC','Ponys 89 A');
  UPDATE public.games SET away_team = 'Ponys 89 A FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Ponys','PON','Ponys 89 A FC','Ponys 89 A');
  UPDATE public.games SET home_team = 'Aztecas FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Aztecas','AZT','Aztecas FC');
  UPDATE public.games SET away_team = 'Aztecas FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Aztecas','AZT','Aztecas FC');
  UPDATE public.games SET home_team = 'Black Ravens A FCA' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Black Ravens','BR','Black Ravens A FCA','Black Reavens');
  UPDATE public.games SET away_team = 'Black Ravens A FCA' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Black Ravens','BR','Black Ravens A FCA','Black Reavens');
  UPDATE public.games SET home_team = 'Halconas Verdes FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND home_team IN ('Halconas Dgo','HAL','Halconas Verdes FC','Halconas Durango');
  UPDATE public.games SET away_team = 'Halconas Verdes FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-a' AND away_team IN ('Halconas Dgo','HAL','Halconas Verdes FC','Halconas Durango');

  -- ========== FEMENIL COOPER B ==========
  UPDATE public.games SET home_team = 'Blue Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Blue Axis','BAX','Blue Axis FC');
  UPDATE public.games SET away_team = 'Blue Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Blue Axis','BAX','Blue Axis FC');
  UPDATE public.games SET home_team = 'BLUEHIDES FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('BlueHidess','Blue Hidess','BLU','BLUEHIDES FC','BlueHides');
  UPDATE public.games SET away_team = 'BLUEHIDES FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('BlueHidess','Blue Hidess','BLU','BLUEHIDES FC','BlueHides');
  UPDATE public.games SET home_team = 'Mini Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Mini Axis','MAX','Mini Axis FC');
  UPDATE public.games SET away_team = 'Mini Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Mini Axis','MAX','Mini Axis FC');
  UPDATE public.games SET home_team = 'Osas D FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Osas D','OSD','Osas D FC');
  UPDATE public.games SET away_team = 'Osas D FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Osas D','OSD','Osas D FC');
  UPDATE public.games SET home_team = 'Halconas 130 FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Halconas 130','130','HAL','Halconas 130 FC');
  UPDATE public.games SET away_team = 'Halconas 130 FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Halconas 130','130','HAL','Halconas 130 FC');
  UPDATE public.games SET home_team = 'Black Ravens B FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Black Ravens','BR','Black Ravens B FCB','Black Reavens');
  UPDATE public.games SET away_team = 'Black Ravens B FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Black Ravens','BR','Black Ravens B FCB','Black Reavens');
  UPDATE public.games SET home_team = 'Osas E FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Osas E','OSE','Osas E FC');
  UPDATE public.games SET away_team = 'Osas E FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Osas E','OSE','Osas E FC');
  UPDATE public.games SET home_team = 'Bufalos UIM FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Bufalos UIM','UIM','Bufalos UIM FCB','Búfalos UIM');
  UPDATE public.games SET away_team = 'Bufalos UIM FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Bufalos UIM','UIM','Bufalos UIM FCB','Búfalos UIM');
  UPDATE public.games SET home_team = 'White Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Axis Blancas','AXB','White Axis FC','White Axis');
  UPDATE public.games SET away_team = 'White Axis FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Axis Blancas','AXB','White Axis FC','White Axis');
  UPDATE public.games SET home_team = 'Cobras Prime FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Cobras','COP','Cobras Prime FC','Cobras Prime');
  UPDATE public.games SET away_team = 'Cobras Prime FC' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Cobras','COP','Cobras Prime FC','Cobras Prime');
  UPDATE public.games SET home_team = 'Aztecas B FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND home_team IN ('Aztecas B','AZT','Aztecas B FCB');
  UPDATE public.games SET away_team = 'Aztecas B FCB' WHERE season_id=v_season AND jornada=2 AND category='femenil-cooper-b' AND away_team IN ('Aztecas B','AZT','Aztecas B FCB');

  -- ========== FEMENIL SILVER ==========
  UPDATE public.games SET home_team = 'Hellcats  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Hellcats','HEL','HELL','Hellcats  FS','Hellcats FS');
  UPDATE public.games SET away_team = 'Hellcats  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Hellcats','HEL','HELL','Hellcats  FS','Hellcats FS');
  UPDATE public.games SET home_team = 'Rebels FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Rebels','REB','Rebels FS');
  UPDATE public.games SET away_team = 'Rebels FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Rebels','REB','Rebels FS');
  UPDATE public.games SET home_team = 'Osas B FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Osas B','OSB','Osas B FS');
  UPDATE public.games SET away_team = 'Osas B FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Osas B','OSB','Osas B FS');
  UPDATE public.games SET home_team = 'Burras Blancas ITD FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('ITD','Burras Blancas ITD FS','Burras Blancas ITD');
  UPDATE public.games SET away_team = 'Burras Blancas ITD FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('ITD','Burras Blancas ITD FS','Burras Blancas ITD');
  UPDATE public.games SET home_team = 'Osas A FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Osas A','OSA','Osas A FS');
  UPDATE public.games SET away_team = 'Osas A FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Osas A','OSA','Osas A FS');
  UPDATE public.games SET home_team = 'Ducks FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Ducks','DUC','Ducks FS');
  UPDATE public.games SET away_team = 'Ducks FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Ducks','DUC','Ducks FS');
  UPDATE public.games SET home_team = 'Tigres Blancos FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Tigres Blancos','TB','Tigres Blancos FS');
  UPDATE public.games SET away_team = 'Tigres Blancos FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Tigres Blancos','TB','Tigres Blancos FS');
  UPDATE public.games SET home_team = 'Quetzas  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Quetzas FADER','FAD','Quetzas','Quetzas  FS','Quetzas FS');
  UPDATE public.games SET away_team = 'Quetzas  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Quetzas FADER','FAD','Quetzas','Quetzas  FS','Quetzas FS');
  UPDATE public.games SET home_team = 'Ponys 89 FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Ponys A','Ponys','PON','Ponys 89 FS','Ponys 89');
  UPDATE public.games SET away_team = 'Ponys 89 FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Ponys A','Ponys','PON','Ponys 89 FS','Ponys 89');
  UPDATE public.games SET home_team = 'Lobas ITES  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Lobas ITS','ITS','Lobas ITES','Lobas ITES  FS','Lobas ITES FS');
  UPDATE public.games SET away_team = 'Lobas ITES  FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Lobas ITS','ITS','Lobas ITES','Lobas ITES  FS','Lobas ITES FS');
  UPDATE public.games SET home_team = 'Ponys B FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Ponys B','Ponys B FS');
  UPDATE public.games SET away_team = 'Ponys B FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Ponys B','Ponys B FS');
  UPDATE public.games SET home_team = 'Aztecas FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Aztecas','AZT','Aztecas FS');
  UPDATE public.games SET away_team = 'Aztecas FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Aztecas','AZT','Aztecas FS');
  UPDATE public.games SET home_team = 'Búfalos UTD FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Bufalos UTD','UTD','Búfalos UTD FS','Bufalos UTD FS');
  UPDATE public.games SET away_team = 'Búfalos UTD FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Bufalos UTD','UTD','Búfalos UTD FS','Bufalos UTD FS');
  UPDATE public.games SET home_team = 'Cobras Prime FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND home_team IN ('Cobras','Cobras Prime','Cobras Prime FS');
  UPDATE public.games SET away_team = 'Cobras Prime FS' WHERE season_id=v_season AND jornada=2 AND category='femenil-silver' AND away_team IN ('Cobras','Cobras Prime','Cobras Prime FS');

  -- ========== FEMENIL GOLD ==========
  UPDATE public.games SET home_team = 'Thunders FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('Thunders','THU','Thunders FG');
  UPDATE public.games SET away_team = 'Thunders FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('Thunders','THU','Thunders FG');
  UPDATE public.games SET home_team = 'DSM BBYS FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('DSM BBYS','BBY','DSM BBYS FG');
  UPDATE public.games SET away_team = 'DSM BBYS FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('DSM BBYS','BBY','DSM BBYS FG');
  UPDATE public.games SET home_team = 'Ducks FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('Ducks','DUC','Ducks FG');
  UPDATE public.games SET away_team = 'Ducks FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('Ducks','DUC','Ducks FG');
  UPDATE public.games SET home_team = 'Lobas UAD FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('Lobas UAD','UAD','Lobas UAD FG');
  UPDATE public.games SET away_team = 'Lobas UAD FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('Lobas UAD','UAD','Lobas UAD FG');
  UPDATE public.games SET home_team = 'DSM OLDIES FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('DSM OLDIES','OLD','DSM OLDIES FG');
  UPDATE public.games SET away_team = 'DSM OLDIES FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('DSM OLDIES','OLD','DSM OLDIES FG');
  UPDATE public.games SET home_team = 'Black Ravens  FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('Black Ravens','BR','BlackReavens','Black Reavens','Black Ravens  FG','Black Ravens FG');
  UPDATE public.games SET away_team = 'Black Ravens  FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('Black Ravens','BR','BlackReavens','Black Reavens','Black Ravens  FG','Black Ravens FG');
  UPDATE public.games SET home_team = 'Leonas FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND home_team IN ('Leonas','LEO','Leonas FG');
  UPDATE public.games SET away_team = 'Leonas FG' WHERE season_id=v_season AND jornada=2 AND category='femenil-gold' AND away_team IN ('Leonas','LEO','Leonas FG');

  -- ========== MIXTO SILVER ==========
  UPDATE public.games SET home_team = 'Osos MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Osos','OSO','Osos MS');
  UPDATE public.games SET away_team = 'Osos MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Osos','OSO','Osos MS');
  UPDATE public.games SET home_team = 'White Axis MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Axis Blancos','AXB','White Axis','White Axis MS');
  UPDATE public.games SET away_team = 'White Axis MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Axis Blancos','AXB','White Axis','White Axis MS');
  UPDATE public.games SET home_team = 'Halcones 130 MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Halcones 130','130','HAL','Halcones 130 MS');
  UPDATE public.games SET away_team = 'Halcones 130 MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Halcones 130','130','HAL','Halcones 130 MS');
  UPDATE public.games SET home_team = 'Cerberus MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Cerberus','CER','Cerberus MS');
  UPDATE public.games SET away_team = 'Cerberus MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Cerberus','CER','Cerberus MS');
  UPDATE public.games SET home_team = 'Anti✦Hero' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Anti-Hero','ANT','Anti✦Hero');
  UPDATE public.games SET away_team = 'Anti✦Hero' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Anti-Hero','ANT','Anti✦Hero');
  UPDATE public.games SET home_team = 'Happy Monos MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Happy Monos','HM','Happy Monos MS');
  UPDATE public.games SET away_team = 'Happy Monos MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Happy Monos','HM','Happy Monos MS');
  UPDATE public.games SET home_team = 'Burros Blancos ITD MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('ITD','Burros Blancos ITD','Burros Blancos ITD MS');
  UPDATE public.games SET away_team = 'Burros Blancos ITD MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('ITD','Burros Blancos ITD','Burros Blancos ITD MS');
  UPDATE public.games SET home_team = 'Rebels MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Rebels','REB','Rebels MS');
  UPDATE public.games SET away_team = 'Rebels MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Rebels','REB','Rebels MS');
  UPDATE public.games SET home_team = 'Pumas el salto  MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Pumas','PUM','Pumas el salto','Pumas el salto  MS','Pumas el salto MS');
  UPDATE public.games SET away_team = 'Pumas el salto  MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Pumas','PUM','Pumas el salto','Pumas el salto  MS','Pumas el salto MS');
  UPDATE public.games SET home_team = 'Aztecas MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Aztecas','AZT','Aztecas MS');
  UPDATE public.games SET away_team = 'Aztecas MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Aztecas','AZT','Aztecas MS');
  UPDATE public.games SET home_team = 'BLUEHIDES MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('BlueHidess','BLU','BLUEHIDES MS','BlueHides');
  UPDATE public.games SET away_team = 'BLUEHIDES MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('BlueHidess','BLU','BLUEHIDES MS','BlueHides');
  UPDATE public.games SET home_team = 'Perritos Panzones MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Perritos Panzones','PP','Perritos Panzones MS');
  UPDATE public.games SET away_team = 'Perritos Panzones MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Perritos Panzones','PP','Perritos Panzones MS');
  UPDATE public.games SET home_team = 'Tlacuaches MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Tlacuaches','TLA','Tlacuaches MS');
  UPDATE public.games SET away_team = 'Tlacuaches MS' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Tlacuaches','TLA','Tlacuaches MS');
  -- UTD en mixto-silver del Excel → Búfalos UTD MG (único UTD mixto activo)
  UPDATE public.games SET home_team = 'Búfalos UTD MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND home_team IN ('Bufalos UTD','UTD','Búfalos UTD','Búfalos UTD MG');
  UPDATE public.games SET away_team = 'Búfalos UTD MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-silver' AND away_team IN ('Bufalos UTD','UTD','Búfalos UTD','Búfalos UTD MG');

  -- ========== MIXTO GOLD ==========
  UPDATE public.games SET home_team = 'Axis MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Axis','AX','Axis MG');
  UPDATE public.games SET away_team = 'Axis MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Axis','AX','Axis MG');
  UPDATE public.games SET home_team = 'Justice League MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Justice League','JL','Justice League MG');
  UPDATE public.games SET away_team = 'Justice League MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Justice League','JL','Justice League MG');
  UPDATE public.games SET home_team = 'Goldens MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Goldens','GOL','Goldens MG');
  UPDATE public.games SET away_team = 'Goldens MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Goldens','GOL','Goldens MG');
  UPDATE public.games SET home_team = 'Ducks Morados MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Ducks','DUC','Ducks Morados','Ducks Morados MG');
  UPDATE public.games SET away_team = 'Ducks Morados MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Ducks','DUC','Ducks Morados','Ducks Morados MG');
  UPDATE public.games SET home_team = 'Black Ravens MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Black Ravens','BR','Black Reavens','Black Ravens MG');
  UPDATE public.games SET away_team = 'Black Ravens MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Black Ravens','BR','Black Reavens','Black Ravens MG');
  UPDATE public.games SET home_team = 'BURROS BLANCOS ITD MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('ITD','BURROS BLANCOS ITD MG','Burros Blancos ITD');
  UPDATE public.games SET away_team = 'BURROS BLANCOS ITD MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('ITD','BURROS BLANCOS ITD MG','Burros Blancos ITD');
  UPDATE public.games SET home_team = 'Leones' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Leones','LEO');
  UPDATE public.games SET away_team = 'Leones' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Leones','LEO');
  UPDATE public.games SET home_team = 'Prime MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND home_team IN ('Prime','PRI','Prime MG');
  UPDATE public.games SET away_team = 'Prime MG' WHERE season_id=v_season AND jornada=2 AND category='mixto-gold' AND away_team IN ('Prime','PRI','Prime MG');

  -- ========== VARONIL SILVER ==========
  UPDATE public.games SET home_team = 'Halcones 130 VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Halcones 130','130','HAL','Halcones 130 VS');
  UPDATE public.games SET away_team = 'Halcones 130 VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Halcones 130','130','HAL','Halcones 130 VS');
  UPDATE public.games SET home_team = 'Rockets VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Rockerts','Rockets','ROC','Rockets VG');
  UPDATE public.games SET away_team = 'Rockets VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Rockerts','Rockets','ROC','Rockets VG');
  UPDATE public.games SET home_team = 'Malosos ' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Malosos','MAL','Malosos ');
  UPDATE public.games SET away_team = 'Malosos ' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Malosos','MAL','Malosos ');
  UPDATE public.games SET home_team = 'Leones VS VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Leones','LEO','Leones VS','Leones VS VS');
  UPDATE public.games SET away_team = 'Leones VS VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Leones','LEO','Leones VS','Leones VS VS');
  UPDATE public.games SET home_team = 'Black Ravens' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Black Ravens','BR','Black Reavens');
  UPDATE public.games SET away_team = 'Black Ravens' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Black Ravens','BR','Black Reavens');
  UPDATE public.games SET home_team = 'Perritos Panzones VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Perritos Panzones','PP','Perritos Panzones VS');
  UPDATE public.games SET away_team = 'Perritos Panzones VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Perritos Panzones','PP','Perritos Panzones VS');
  UPDATE public.games SET home_team = 'Aztecas  VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Aztecas','AZT','Aztecas  VS','Aztecas VS');
  UPDATE public.games SET away_team = 'Aztecas  VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Aztecas','AZT','Aztecas  VS','Aztecas VS');
  UPDATE public.games SET home_team = 'Escorpiones VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Escorpiones','ESC','Escorpiones VS');
  UPDATE public.games SET away_team = 'Escorpiones VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Escorpiones','ESC','Escorpiones VS');
  UPDATE public.games SET home_team = 'Búfalos uim VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND home_team IN ('Bufalos UIM','UIM','Búfalos uim VS','Bufalos uim VS','Búfalos UIM');
  UPDATE public.games SET away_team = 'Búfalos uim VS' WHERE season_id=v_season AND jornada=2 AND category='varonil-silver' AND away_team IN ('Bufalos UIM','UIM','Búfalos uim VS','Bufalos uim VS','Búfalos UIM');

  -- ========== VARONIL GOLD ==========
  UPDATE public.games SET home_team = 'Goldens' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Goldens','GOL');
  UPDATE public.games SET away_team = 'Goldens' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Goldens','GOL');
  UPDATE public.games SET home_team = 'BURROS BLANCOS ITD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('ITD','BURROS BLANCOS ITD VG','Burros Blancos ITD');
  UPDATE public.games SET away_team = 'BURROS BLANCOS ITD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('ITD','BURROS BLANCOS ITD VG','Burros Blancos ITD');
  UPDATE public.games SET home_team = 'Axis VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Axis','AX','Axis VG');
  UPDATE public.games SET away_team = 'Axis VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Axis','AX','Axis VG');
  UPDATE public.games SET home_team = 'RUST-EZE VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Rust-Eze','RUS','RUST-EZE VG','Rust Eze');
  UPDATE public.games SET away_team = 'RUST-EZE VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Rust-Eze','RUS','RUST-EZE VG','Rust Eze');
  UPDATE public.games SET home_team = 'Ducks M VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Ducks M','DUM','Ducks M VG');
  UPDATE public.games SET away_team = 'Ducks M VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Ducks M','DUM','Ducks M VG');
  UPDATE public.games SET home_team = 'Thunders VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Thunders','THU','Thunders VG');
  UPDATE public.games SET away_team = 'Thunders VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Thunders','THU','Thunders VG');
  UPDATE public.games SET home_team = 'Búfalos UTD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Bufalos UTD','UTD','Búfalos UTD VG','Búfalos UTD');
  UPDATE public.games SET away_team = 'Búfalos UTD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Bufalos UTD','UTD','Búfalos UTD VG','Búfalos UTD');
  UPDATE public.games SET home_team = 'Ducks N VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Ducks N','DUN','Ducks N VG');
  UPDATE public.games SET away_team = 'Ducks N VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Ducks N','DUN','Ducks N VG');
  UPDATE public.games SET home_team = 'Lobos UAD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND home_team IN ('Lobos UAD','UAD','Lobos UAD VG');
  UPDATE public.games SET away_team = 'Lobos UAD VG' WHERE season_id=v_season AND jornada=2 AND category='varonil-gold' AND away_team IN ('Lobos UAD','UAD','Lobos UAD VG');

END $$;

-- Verificación: partidos J2 cuyo home/away NO existe en teams activos
SELECT g.id, g.category, g.home_team, g.away_team, g.game_time, g.field
FROM games g
WHERE g.jornada = 2
  AND g.game_date = DATE '2026-09-27'
  AND g.season_id = (SELECT id FROM seasons WHERE is_active LIMIT 1)
  AND (
    NOT EXISTS (SELECT 1 FROM teams t WHERE t.season_id = g.season_id AND t.name = g.home_team)
    OR NOT EXISTS (SELECT 1 FROM teams t WHERE t.season_id = g.season_id AND t.name = g.away_team)
  )
ORDER BY g.game_time, g.field;
