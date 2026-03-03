import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const season = searchParams.get("season") || "2025"

let query = supabase
      .from("games")
      .select(`
        id,
        home_team,
        away_team,
        home_score,
        away_score,
        game_date,
        game_time,
        venue,
        field,
        category,
        status,
        match_type,
        jornada,
        referee1,
        referee2,
        mvp,
        stage,
        season,
        created_at,
        updated_at,
        current_period,
        clock_running,
        clock_last_started_at,
        seconds_remaining
      `)
      .eq("season", season)

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query.order("game_date", { ascending: true }).order("game_time", { ascending: true })

    if (error) {
      console.error("Error fetching games:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error("GET /api/games error:", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      home_team,
      away_team,
      home_score,
      away_score,
      game_date,
      game_time,
      venue,
      field,
      category,
      status,
      match_type,
      jornada,
      referee1,
      referee2,
      mvp,
      stage,
      season = "2025",
    } = body

    // Validaciones básicas
    if (!home_team || !away_team || !game_date || !game_time || !venue || !field || !category) {
      return NextResponse.json({ success: false, message: "Faltan campos requeridos" }, { status: 400 })
    }

    if (home_team === away_team) {
      return NextResponse.json(
        { success: false, message: "El equipo local y visitante no pueden ser el mismo" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          home_team,
          away_team,
          home_score: home_score || null,
          away_score: away_score || null,
          game_date,
          game_time,
          venue,
          field,
          category,
          status: status || "programado",
          match_type: match_type || "jornada",
          jornada: jornada || null,
          referee1: referee1 || null,
          referee2: referee2 || null,
          mvp: mvp || null,
          stage: stage || "regular",
          season,
        },
      ])
      .select()

    if (error) {
      console.error("Error creating game:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error: any) {
    console.error("POST /api/games error:", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "ID del juego es requerido" }, { status: 400 })
    }

    // Si el juego se marca como finalizado y tiene MVP, crear entrada en tabla mvps
    if (updateData.status === "finalizado" && updateData.mvp) {
      // Buscar el jugador por nombre
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, team_id, teams!players_team_id_fkey(category)")
        .eq("name", updateData.mvp)
        .single()

      if (!playerError && playerData) {
        // Crear entrada de MVP de juego
        await supabase.from("mvps").insert([
          {
            player_id: playerData.id,
            mvp_type: "game",
            category: playerData.teams.category,
            game_id: id,
            season: "2025",
            notes: `MVP del juego ${updateData.home_team} vs ${updateData.away_team}`,
          },
        ])
      }
    }

    const { data, error } = await supabase.from("games").update(updateData).eq("id", id).select()

    if (error) {
      console.error("Error updating game:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: "Juego no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error: any) {
    console.error("PUT /api/games error:", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, message: "ID del juego es requerido" }, { status: 400 })
    }

    const { error } = await supabase.from("games").delete().eq("id", id)

    if (error) {
      console.error("Error deleting game:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Juego eliminado correctamente" })
  } catch (error: any) {
    console.error("DELETE /api/games error:", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
