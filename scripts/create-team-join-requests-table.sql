-- Create team_join_requests table if it does not exist yet
CREATE TABLE IF NOT EXISTS team_join_requests (
  id SERIAL PRIMARY KEY,
  player_user_id INTEGER NOT NULL,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  position VARCHAR(50),
  jersey_number INTEGER,
  phone VARCHAR(20),
  message TEXT,
  status VARCHAR(30) DEFAULT 'pending' NOT NULL,
  is_transfer BOOLEAN DEFAULT false,
  from_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  requires_coordinator_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add columns that may not exist yet (idempotent)
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false;
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS from_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS requires_coordinator_approval BOOLEAN DEFAULT false;

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_tjr_team_id ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_tjr_player_user_id ON team_join_requests(player_user_id);
CREATE INDEX IF NOT EXISTS idx_tjr_status ON team_join_requests(status);

-- Ensure players table has all the profile columns the app expects
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS personal_email VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE players ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE players ADD COLUMN IF NOT EXISTS seasons_played INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS playing_since DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS cedula_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS category_verified BOOLEAN DEFAULT false;
