import { supabase } from "@/lib/supabase-admin"
import {
  applyAdjustment,
  gameCountsForStandings,
  recordFromGames,
  type StandingRow,
  type StandingsAdjustment,
  type StandingsGame,
} from "@/lib/standings-calc"

export * from "@/lib/standings-calc"

export async function loadAdjustments(seasonId: string): Promise<Map<number, StandingsAdjustment>> {
  const { data, error } = await supabase.from("standings_adjustments").select("*").eq("season_id", seasonId)
  // Si aún no se corre scripts/2026-11-09-ajustes-tabla.sql la tabla no existe: se calcula sin ajustes.
  if (error) return new Map()
  return new Map((data || []).map((a: StandingsAdjustment) => [a.team_id, a]))
}

export async function getStandings({
  seasonId,
  category,
}: {
  seasonId: string
  category?: string | null
}): Promise<StandingRow[]> {
  const filterCategory = category && category !== "all" ? category : null

  let teamsQuery = supabase.from("teams").select("*").eq("status", "active").eq("season_id", seasonId)
  if (filterCategory) teamsQuery = teamsQuery.eq("category", filterCategory)

  let gamesQuery = supabase
    .from("games")
    .select("id, home_team, away_team, home_score, away_score, category, status, counts_for_standings, game_type, match_type")
    .eq("season_id", seasonId)
    .eq("status", "finalizado")
  if (filterCategory) gamesQuery = gamesQuery.eq("category", filterCategory)

  const [{ data: teams, error: teamsError }, { data: games, error: gamesError }, adjustments] = await Promise.all([
    teamsQuery,
    gamesQuery,
    loadAdjustments(seasonId),
  ])
  if (teamsError) throw new Error(teamsError.message)
  if (gamesError) throw new Error(gamesError.message)

  const counted = ((games || []) as StandingsGame[]).filter((g) => gameCountsForStandings(g, filterCategory))

  const rows: StandingRow[] = (teams || []).map((team: any) => {
    const fromGames = recordFromGames(team.name, counted)
    const adjustment = adjustments.get(team.id) || null
    const totals = applyAdjustment(fromGames, adjustment)
    return {
      ...totals,
      team_id: team.id,
      team_name: team.name,
      team_category: team.category,
      team_logo: team.logo_url,
      team_color1: team.color1,
      team_color2: team.color2,
      point_difference: totals.points_for - totals.points_against,
      win_percentage: totals.games_played > 0 ? ((totals.games_won / totals.games_played) * 100).toFixed(1) : "0.0",
      position: 0,
      from_games: fromGames,
      adjustment,
    }
  })

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.point_difference !== a.point_difference) return b.point_difference - a.point_difference
    return b.points_for - a.points_for
  })
  rows.forEach((row, index) => {
    row.position = index + 1
  })
  return rows
}
