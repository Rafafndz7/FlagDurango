-- Draft games + solicitudes de horario (idempotente)
-- Ejecutar en Supabase SQL Editor

-- 1) Draft en partidos (no públicos hasta aceptar/publicar)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draft_notes text;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS allow_shared_slot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_games_is_draft ON public.games(is_draft);
CREATE INDEX IF NOT EXISTS idx_games_slot ON public.games(game_date, game_time, field);

COMMENT ON COLUMN public.games.is_draft IS 'true = borrador, no aparece en calendario público hasta publicar';
COMMENT ON COLUMN public.games.allow_shared_slot IS 'permite compartir horario/campo cuando coach/jugador está en dos partidos';

-- Partidos existentes se consideran publicados
UPDATE public.games SET is_draft = false WHERE is_draft IS DISTINCT FROM false;

-- 2) Solicitudes de horario (capitán / coach)
CREATE TABLE IF NOT EXISTS public.schedule_slot_requests (
  id bigserial PRIMARY KEY,
  season_id uuid REFERENCES public.seasons(id),
  team_id integer REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name text,
  requested_by_name text,
  requested_by_role text DEFAULT 'captain', -- captain | coach | player | admin
  game_date date NOT NULL,
  game_time time NOT NULL,
  field text,
  category text,
  reason text,
  request_type text NOT NULL DEFAULT 'occupy'
    CHECK (request_type IN ('occupy','share','move')),
  related_game_id integer REFERENCES public.games(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','applied')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_by integer,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON public.schedule_slot_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_date ON public.schedule_slot_requests(game_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_slot_requests TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
