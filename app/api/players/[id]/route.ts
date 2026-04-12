import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ==========================================
// GET: Obtener detalles de un jugador
// ==========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, message: "ID invalido" },
        { status: 400 }
      )
    }

    const { data: player, error } = await supabase
      .from("players")
      .select(
        `
        id,
        name,
        jersey_number,
        position,
        photo_url,
        team_id,
        seasons_played,
        playing_since,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url,
          color1,
          color2,
          coach_name
        )
      `
      )
      .eq("id", Number(id))
      .single()

    if (error || !player) {
      return NextResponse.json(
        { success: false, message: "Jugador no encontrado" },
        { status: 404 }
      )
    }

    // Get attendance stats
    const { count: gamesPlayed } = await supabase
      .from("game_attendance")
      .select("*", { count: "exact", head: true })
      .eq("player_id", Number(id))
      .eq("status", "present")

    // Get player stats
    const { data: stats } = await supabase
      .from("player_game_stats")
      .select("touchdowns, interceptions, sacks, extra_points, flags")
      .eq("player_id", Number(id))

    const totalStats = (stats || []).reduce(
      (acc, s) => ({
        touchdowns: acc.touchdowns + (s.touchdowns || 0),
        interceptions: acc.interceptions + (s.interceptions || 0),
        sacks: acc.sacks + (s.sacks || 0),
        extra_points: acc.extra_points + (s.extra_points || 0),
        flags: acc.flags + (s.flags || 0),
      }),
      { touchdowns: 0, interceptions: 0, sacks: 0, extra_points: 0, flags: 0 }
    )

    return NextResponse.json({
      success: true,
      data: {
        ...player,
        games_played: gamesPlayed || 0,
        stats: totalStats,
      },
    })
  } catch (error: any) {
    console.error("GET /api/players/[id] error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    )
  }
}

// ==========================================
// PUT: Editar los datos de un jugador
// ==========================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, message: "ID invalido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, jersey_number, position, photo_url, team_id } = body

    const { data, error } = await supabase
      .from("players")
      .update({
        name,
        jersey_number: jersey_number ? Number(jersey_number) : null,
        position,
        photo_url,
        team_id: team_id ? Number(team_id) : null,
      })
      .eq("id", Number(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("PUT /api/players/[id] error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    )
  }
}

// ==========================================
// DELETE: Eliminar un jugador
// ==========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, message: "ID invalido" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", Number(id))

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Jugador eliminado exitosamente" })
  } catch (error: any) {
    console.error("DELETE /api/players/[id] error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
