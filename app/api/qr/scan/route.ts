import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function extractPlayerId(qrData: string): number | null {
  // Try URL format first: .../perfil/123
  const urlMatch = qrData.match(/\/perfil\/(\d+)/)
  if (urlMatch) {
    return Number(urlMatch[1])
  }

  // Try old JSON format: {"type":"player_attendance","player_id":123,...}
  try {
    const parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData
    if (parsed.type === "player_attendance" && parsed.player_id) {
      return Number(parsed.player_id)
    }
  } catch {
    // not JSON
  }

  // Try plain number
  const num = Number(qrData)
  if (!isNaN(num) && num > 0) {
    return num
  }

  return null
}

// POST - Scan QR and register attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qr_data, game_id } = body

    if (!qr_data || !game_id) {
      return NextResponse.json(
        { success: false, message: "qr_data y game_id son requeridos" },
        { status: 400 }
      )
    }

    const playerId = extractPlayerId(qr_data)

    if (!playerId) {
      return NextResponse.json(
        { success: false, message: "QR invalido - no se pudo identificar al jugador" },
        { status: 400 }
      )
    }

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select(`
        id,
        name,
        jersey_number,
        position,
        team_id,
        photo_url,
        teams!players_team_id_fkey (
          id,
          name,
          category
        )
      `)
      .eq("id", playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { success: false, message: "Jugador no encontrado en la base de datos" },
        { status: 404 }
      )
    }

    // Verify game exists
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, home_team, away_team, status, game_date")
      .eq("id", Number(game_id))
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { success: false, message: "Partido no encontrado" },
        { status: 404 }
      )
    }

    // Check if attendance already registered
    const { data: existing } = await supabase
      .from("game_attendance")
      .select("id, attended")
      .eq("game_id", Number(game_id))
      .eq("player_id", playerId)
      .maybeSingle()

    if (existing && existing.attended) {
      return NextResponse.json({
        success: true,
        already_registered: true,
        message: `${player.name} ya tiene asistencia registrada`,
        data: {
          player,
          game,
          attended: true,
        },
      })
    }

    // Register or update attendance
    let result
    if (existing) {
      result = await supabase
        .from("game_attendance")
        .update({ attended: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from("game_attendance")
        .insert({
          game_id: Number(game_id),
          player_id: playerId,
          attended: true,
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      already_registered: false,
      message: `Asistencia registrada para ${player.name}`,
      data: {
        player,
        game,
        attended: true,
        attendance: result.data,
      },
    })
  } catch (error: any) {
    console.error("POST /api/qr/scan error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
