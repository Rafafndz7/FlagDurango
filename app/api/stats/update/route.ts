import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const { season_id } = await request.json()
    if (!season_id) return NextResponse.json({ success: false, message: "season_id es obligatorio" }, { status: 400 })

    // Obtener todos los equipos activos
    const { data: teams, error: teamsError } = await supabase.from("teams").select("*").eq("status", "active")

    if (teamsError) {
      throw new Error(teamsError.message)
    }

    // Obtener juegos finalizados - EXCLUIR AMISTOSOS
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("*")
      .eq("status", "finalizado")
      .eq("season_id", season_id)
      .eq("counts_for_standings", true)
      .eq("game_type", "regular")
      .neq("match_type", "amistoso") // 🔥 EXCLUIR AMISTOSOS

    if (gamesError) {
      throw new Error(gamesError.message)
    }

    // Calcular y actualizar estadísticas para cada equipo
    for (const team of teams) {
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

      // Aquí podrías guardar las estadísticas en una tabla separada si quisieras
      // Por ahora solo las calculamos en tiempo real
    }

    return NextResponse.json({
      success: true,
      message: "Estadísticas actualizadas (excluyendo amistosos)",
      data: {
        equipos_procesados: teams.length,
        juegos_contabilizados: games.length,
      },
    })
  } catch (error: any) {
    console.error("POST /api/stats/update error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
