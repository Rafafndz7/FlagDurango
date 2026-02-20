-- 1. Agregar 'player' al CHECK constraint de users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check'
      AND table_name = 'users'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (lower(role) IN ('admin','coach','capitan','user','staff','referee','player'));
END
$$;

-- 2. Agregar user_id a players si no existe (para vincular cuenta de jugador)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id);
  END IF;
END
$$;

-- 3. Hacer team_id nullable en players (jugadores sin equipo al registrarse)
ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;

-- 4. Crear tabla de solicitudes de ingreso a equipo
CREATE TABLE IF NOT EXISTS team_join_requests (
  id SERIAL PRIMARY KEY,
  player_user_id INTEGER NOT NULL REFERENCES users(id),
  player_id INTEGER REFERENCES players(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_number INTEGER NOT NULL CHECK (jersey_number BETWEEN 1 AND 99),
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indices para performance
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_player_user_id ON team_join_requests(player_user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON team_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- 6. Evitar solicitudes duplicadas pendientes del mismo jugador al mismo equipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
  ON team_join_requests(player_user_id, team_id) 
  WHERE status = 'pending';
