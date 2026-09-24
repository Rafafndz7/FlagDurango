import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("game_id")
    const playerId = searchParams.get("player_id")
    const teamId = searchParams.get("team_id")
    const ranking = searchParams.get("ranking")
    const coverage = searchParams.get("coverage")

    // Cobertura: qué partidos ya tienen filas de stats
    if (coverage === "1" || coverage === "true") {
      const { data, error } = await supabase.from("player_game_stats").select("game_id")
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }
      const counts: Record<number, number> = {}
      for (const row of data || []) {
        const gid = Number(row.game_id)
        if (!gid) continue
        counts[gid] = (counts[gid] || 0) + 1
      }
      return NextResponse.json({
        success: true,
        game_ids: Object.keys(counts).map(Number),
        counts,
      })
    }

    if (ranking === "true") {
      // Obtener estadisticas acumuladas de todos los jugadores
      const { data, error } = await supabase
        .from("player_game_stats")
        .select(`
          *,
          players!player_game_stats_player_id_fkey (
            id, name, jersey_number, position, photo_url, team_id,
            teams!players_team_id_fkey (id, name, logo_url, category)
          )
        `)
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, data })
    }

    let query = supabase.from("player_game_stats").select("*")

    if (gameId) query = query.eq("game_id", Number(gameId))
    if (playerId) query = query.eq("player_id", Number(playerId))
    if (teamId) query = query.eq("team_id", Number(teamId))

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { player_id, game_id, team_id, ...stats } = body

    if (!player_id || !game_id || !team_id) {
      return NextResponse.json({ success: false, message: "Faltan campos requeridos" }, { status: 400 })
    }

    // Calcular totales
    const touchdowns_totales =
      (stats.touchdowns_pase || 0) +
      (stats.touchdowns_carrera || 0) +
      (stats.touchdowns_recepcion || 0) +
      (stats.touchdowns_intercepcion || 0)

    const puntos_totales = touchdowns_totales * 6 + (stats.puntos_extra || 0)

    // Upsert - insertar o actualizar si ya existe para ese jugador y partido
    const { data, error } = await supabase
      .from("player_game_stats")
      .upsert(
        {
          player_id,
          game_id,
          team_id,
          ...stats,
          touchdowns_totales,
          puntos_totales,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id,game_id" },
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()

    if (!body.bulk || !Array.isArray(body.stats)) {
      return NextResponse.json({ success: false, message: "Formato invalido" }, { status: 400 })
    }

    const results = []
    for (const stat of body.stats) {
      const { player_id, game_id, team_id, ...rest } = stat
      const touchdowns_totales =
        (rest.touchdowns_pase || 0) +
        (rest.touchdowns_carrera || 0) +
        (rest.touchdowns_recepcion || 0) +
        (rest.touchdowns_intercepcion || 0)
      const puntos_totales = touchdowns_totales * 6 + (rest.puntos_extra || 0)

      const { data, error } = await supabase
        .from("player_game_stats")
        .upsert(
          {
            player_id,
            game_id,
            team_id,
            ...rest,
            touchdowns_totales,
            puntos_totales,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "player_id,game_id" },
        )
        .select()
        .single()

      if (!error && data) results.push(data)
    }

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    return NextResponse.json({ success: false, message: "Error del servidor" }, { status: 500 })
  }
}
