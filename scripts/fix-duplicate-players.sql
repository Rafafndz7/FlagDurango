-- Fix duplicate players: remove rows that share the same (user_id, team_id) or (name, team_id)
-- keeping only the OLDEST row (smallest id) per group.

-- Step 1: Delete duplicates by user_id + team_id (when user_id IS NOT NULL)
DELETE FROM players
WHERE id NOT IN (
  SELECT MIN(id)
  FROM players
  WHERE user_id IS NOT NULL
  GROUP BY user_id, team_id
)
AND user_id IS NOT NULL
AND id NOT IN (
  SELECT MIN(id)
  FROM players
  WHERE user_id IS NOT NULL
  GROUP BY user_id, team_id
);

-- Step 2: Delete duplicates by name + team_id (case-insensitive, for rows without user_id)
DELETE FROM players p1
WHERE user_id IS NULL
AND EXISTS (
  SELECT 1 FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.team_id = p1.team_id
    AND p2.id < p1.id
);

-- Step 3: Also remove name-based duplicates where one has user_id and one doesn't
-- (keep the one WITH user_id)
DELETE FROM players p1
WHERE p1.user_id IS NULL
AND EXISTS (
  SELECT 1 FROM players p2
  WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
    AND p2.team_id = p1.team_id
    AND p2.user_id IS NOT NULL
);

-- Step 4: For any remaining duplicate (user_id, team_id) pairs, keep the one with the most data
DELETE FROM players
WHERE id IN (
  SELECT p.id
  FROM players p
  INNER JOIN (
    SELECT user_id, team_id, MIN(id) as keep_id
    FROM players
    WHERE user_id IS NOT NULL
    GROUP BY user_id, team_id
    HAVING COUNT(*) > 1
  ) dups ON p.user_id = dups.user_id AND p.team_id = dups.team_id AND p.id != dups.keep_id
);
