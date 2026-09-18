-- Femenil Cooper A/B + Finanzas + Árbitros (idempotente)
-- Ejecutar en Supabase SQL Editor
--
-- Si falla el CHECK, primero corre esto para ver categorías huérfanas:
--   SELECT DISTINCT category FROM public.teams ORDER BY 1;
--   SELECT DISTINCT category FROM public.games ORDER BY 1;

-- ========== 1. Categorías ==========
-- Quitar constraint ANTES de migrar / ampliar la lista
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_category_check;

-- Migrar legacy mientras no hay CHECK
UPDATE public.teams
SET category = 'femenil-cooper-a'
WHERE category = 'femenil-cooper';

UPDATE public.games
SET category = 'femenil-cooper-a'
WHERE category = 'femenil-cooper';

-- Lista amplia: incluye slugs históricos + actuales (libre, recreativo, cooper A/B, etc.)
ALTER TABLE public.teams
  ADD CONSTRAINT teams_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'varonil-libre',
      'varonil-gold',
      'varonil-master',
      'varonil-silver',
      'varonil-cooper',
      'femenil-gold',
      'femenil-silver',
      'femenil-cooper',
      'femenil-cooper-a',
      'femenil-cooper-b',
      'mixto-gold',
      'mixto-silver',
      'mixto-cooper',
      'mixto-recreativo',
      'teens',
      '1v1'
    )
  );

-- ========== 2. Finanzas ==========
CREATE TABLE IF NOT EXISTS public.team_finance (
  id bigserial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id),
  registration_fee numeric(12,2) NOT NULL DEFAULT 1900,
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid','partial','paid')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer,
  UNIQUE (team_id)
);

CREATE TABLE IF NOT EXISTS public.team_payment_installments (
  id bigserial PRIMARY KEY,
  team_finance_id bigint NOT NULL REFERENCES public.team_finance(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  held_by text,
  note text,
  created_by integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_finance_season ON public.team_finance(season_id);
CREATE INDEX IF NOT EXISTS idx_team_installments_finance ON public.team_payment_installments(team_finance_id);

-- ========== 3. Rol coordinador de árbitros ==========
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'admin','coach','capitan','user','staff','referee','player','coordinator','referee_coordinator'
  ));

-- ========== 4. Árbitros (perfiles + asignaciones) ==========
CREATE TABLE IF NOT EXISTS public.referee_profiles (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  default_fee numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  user_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_referee_assignments (
  id bigserial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  referee_id bigint NOT NULL REFERENCES public.referee_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('referee1','referee2','referee3')),
  fee numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, role)
);

CREATE INDEX IF NOT EXISTS idx_game_ref_assign_game ON public.game_referee_assignments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_ref_assign_ref ON public.game_referee_assignments(referee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_finance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_payment_installments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referee_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_referee_assignments TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
