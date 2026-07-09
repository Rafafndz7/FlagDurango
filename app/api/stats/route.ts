import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    let seasonId = searchParams.get("season")
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }
    if (!seasonId) {
      return NextResponse.json({ success: false, message: "No hay una temporada activa." }, { status: 400 })
    }

    // Obtener equipos
    let teamsQuery = supabase.from("teams").select("*").eq("status", "active").eq("season_id", seasonId)

    if (category && category !== "all") {
      teamsQuery = teamsQuery.eq("category", category)
    }

    const { data: teams, error: teamsError } = await teamsQuery

    if (teamsError) {
      throw new Error(teamsError.message)
    }

    // Obtener juegos finalizados - EXCLUIR AMISTOSOS
    let gamesQuery = supabase
      .from("games")
      .select("*")
      .eq("status", "finalizado")
      .eq("season_id", seasonId)
      .eq("counts_for_standings", true)
      .eq("game_type", "regular")
      .neq("match_type", "amistoso") // 🔥 EXCLUIR AMISTOSOS

    if (category && category !== "all") {
      gamesQuery = gamesQuery.eq("category", category)
    }

    const { data: games, error: gamesError } = await gamesQuery

    if (gamesError) {
      throw new Error(gamesError.message)
    }

    // Calcular estadísticas por equipo
    const teamStats = teams.map((team) => {
      const homeGames = games.filter((g) => g.home_team === team.name)
      const awayGames = games.filter((g) => g.away_team === team.name)

      let wins = 0
      let losses = 0
      let ties = 0
      let pointsFor = 0
      let pointsAgainst = 0

      // Juegos como local
      homeGames.forEach((game) => {
        const homeScore = game.home_score || 0
        const awayScore = game.away_score || 0

        pointsFor += homeScore
        pointsAgainst += awayScore

        if (homeScore > awayScore) wins++
        else if (homeScore < awayScore) losses++
        else ties++
      })

      // Juegos como visitante
      awayGames.forEach((game) => {
        const homeScore = game.home_score || 0
        const awayScore = game.away_score || 0

        pointsFor += awayScore
        pointsAgainst += homeScore

        if (awayScore > homeScore) wins++
        else if (awayScore < homeScore) losses++
        else ties++
      })

      const gamesPlayed = homeGames.length + awayGames.length
      const points = wins * 3 + ties * 1
      const winPercentage = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : "0.0"

      return {
        team_id: team.id,
        team_name: team.name,
        team_category: team.category,
        team_logo: team.logo_url,
        team_color1: team.color1,
        team_color2: team.color2,
        games_played: gamesPlayed,
        games_won: wins,
        games_lost: losses,
        games_tied: ties,
        points: points,
        points_for: pointsFor,
        points_against: pointsAgainst,
        point_difference: pointsFor - pointsAgainst,
        win_percentage: winPercentage,
      }
    })

    // Ordenar por puntos, diferencia de goles, y goles a favor
    teamStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.point_difference !== a.point_difference) return b.point_difference - a.point_difference
      return b.points_for - a.points_for
    })

    // Asignar posiciones
    const statsWithPosition = teamStats.map((stat, index) => ({
      ...stat,
      position: index + 1,
    }))

    return NextResponse.json({
      success: true,
      data: statsWithPosition,
    })
  } catch (error: any) {
    console.error("GET /api/stats error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
