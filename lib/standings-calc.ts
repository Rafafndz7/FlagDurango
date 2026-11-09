/** Cálculo de la tabla de posiciones sin acceso a BD (se usa en servidor y en el admin). */

export const ADJUSTABLE_FIELDS = ["wins", "losses", "ties", "points_for", "points_against", "points"] as const
export type AdjustableField = (typeof ADJUSTABLE_FIELDS)[number]

export type StandingsAdjustment = Record<AdjustableField, number> & {
  team_id: number
  season_id: string
  note: string | null
}

export type StandingsGame = {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  category: string | null
  status: string | null
  counts_for_standings: boolean | null
  game_type: string | null
  match_type: string | null
}

export type RecordTotals = {
  games_played: number
  games_won: number
  games_lost: number
  games_tied: number
  points_for: number
  points_against: number
  points: number
}

export type StandingRow = RecordTotals & {
  team_id: number
  team_name: string
  team_category: string
  team_logo: string | null
  team_color1: string
  team_color2: string
  point_difference: number
  win_percentage: string
  position: number
  /** Solo lo que sale de los partidos, sin ajustes */
  from_games: RecordTotals
  adjustment: StandingsAdjustment | null
}

/** Mismas reglas que la tabla pública: finalizado, regular, cuenta para tabla y no amistoso. */
export function gameCountsForStandings(g: StandingsGame, category?: string | null) {
  return (
    g.status === "finalizado" &&
    g.counts_for_standings === true &&
    g.game_type === "regular" &&
    g.match_type != null &&
    g.match_type !== "amistoso" &&
    (!category || g.category === category)
  )
}

export function recordFromGames(teamName: string, games: StandingsGame[]): RecordTotals {
  let wins = 0
  let losses = 0
  let ties = 0
  let pointsFor = 0
  let pointsAgainst = 0
  for (const g of games) {
    const isHome = g.home_team === teamName
    if (!isHome && g.away_team !== teamName) continue
    const mine = (isHome ? g.home_score : g.away_score) || 0
    const theirs = (isHome ? g.away_score : g.home_score) || 0
    pointsFor += mine
    pointsAgainst += theirs
    if (mine > theirs) wins++
    else if (mine < theirs) losses++
    else ties++
  }
  return {
    games_played: wins + losses + ties,
    games_won: wins,
    games_lost: losses,
    games_tied: ties,
    points_for: pointsFor,
    points_against: pointsAgainst,
    points: wins * 3 + ties,
  }
}

export function applyAdjustment(
  base: RecordTotals,
  adj: Pick<StandingsAdjustment, AdjustableField> | null,
): RecordTotals {
  if (!adj) return base
  const wins = base.games_won + adj.wins
  const losses = base.games_lost + adj.losses
  const ties = base.games_tied + adj.ties
  return {
    games_played: wins + losses + ties,
    games_won: wins,
    games_lost: losses,
    games_tied: ties,
    points_for: base.points_for + adj.points_for,
    points_against: base.points_against + adj.points_against,
    points: wins * 3 + ties + adj.points,
  }
}
