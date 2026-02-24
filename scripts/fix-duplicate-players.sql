-- Fix duplicate players and orphan rows
-- Run this in your Supabase SQL Editor to clean up the database.
-- IMPORTANT: Review the SELECT queries first before running the DELETEs!

-- ============================================================
-- STEP 0: Preview what will be affected (run this first!)
-- ============================================================

-- See all orphan rows (player rows with user_id but no team)
-- SELECT id, name, user_id, team_id FROM players WHERE user_id IS NOT NULL AND team_id IS NULL;

-- See all duplicate (user_id, team_id) groups
-- SELECT user_id, team_id, COUNT(*), array_agg(id) as ids
-- FROM players WHERE user_id IS NOT NULL
-- GROUP BY user_id, team_id HAVING COUNT(*) > 1;

-- See all duplicate (name, team_id) groups
-- SELECT LOWER(TRIM(name)), team_id, COUNT(*), array_agg(id) as ids
-- FROM players GROUP BY LOWER(TRIM(name)), team_id HAVING COUNT(*) > 1;

-- ============================================================
-- STEP 1: Propagate user_id to orphan rows with matching name
-- ============================================================
-- If a player has user_id on one row but not on another row with the same name,
-- propagate the user_id to the orphan row.
UPDATE players p1
SET user_id = (
  SELECT p2.user_id FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.user_id IS NOT NULL
  LIMIT 1
)
WHERE p1.user_id IS NULL
AND EXISTS (
  SELECT 1 FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.user_id IS NOT NULL
);

-- ============================================================
-- STEP 2: Remove orphan rows (user_id set, but team_id IS NULL)
-- Only if the user already has at least one row WITH a team.
-- ============================================================
DELETE FROM players
WHERE team_id IS NULL
  AND user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM players p2
    WHERE p2.user_id = players.user_id
      AND p2.team_id IS NOT NULL
  );

-- ============================================================
-- STEP 3: Remove duplicate rows for same (user_id, team_id)
-- Keep the OLDEST row (smallest id)
-- ============================================================
DELETE FROM players
WHERE id IN (
  SELECT p.id
  FROM players p
  INNER JOIN (
    SELECT user_id, team_id, MIN(id) as keep_id
    FROM players
    WHERE user_id IS NOT NULL AND team_id IS NOT NULL
    GROUP BY user_id, team_id
    HAVING COUNT(*) > 1
  ) dups ON p.user_id = dups.user_id AND p.team_id = dups.team_id AND p.id != dups.keep_id
);

-- ============================================================
-- STEP 4: Remove name-based duplicates where one has user_id and one doesn't
-- (keep the one WITH user_id)
-- ============================================================
DELETE FROM players p1
WHERE p1.user_id IS NULL
AND EXISTS (
  SELECT 1 FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.team_id = p1.team_id
    AND p2.user_id IS NOT NULL
);

-- ============================================================
-- STEP 5: Remove remaining name-based duplicates on same team
-- ============================================================
DELETE FROM players p1
WHERE EXISTS (
  SELECT 1 FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.team_id = p1.team_id
    AND p2.id < p1.id
);
