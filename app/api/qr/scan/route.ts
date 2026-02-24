import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function extractPlayerId(qrData: string): number | null {
  const urlMatch = qrData.match(/\/perfil\/(\d+)/)
  if (urlMatch) return Number(urlMatch[1])

  try {
    const parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData
    if (parsed.player_id) return Number(parsed.player_id)
  } catch {}

  const num = Number(qrData)
  return (!isNaN(num) && num > 0) ? num : null
}

export async function POST(request: NextRequest) {
  try {
    const { qr_data, game_id } = await request.json()
    const playerId = extractPlayerId(qr_data)

    if (!playerId || !game_id) {
      return NextResponse.json({ success: false, message: "Datos de QR o partido inválidos" }, { status: 400 })
    }

    // 1. Obtener datos del jugador (con alias para el equipo)
    const { data: player, error: pErr } = await supabase
      .from("players")
      .select(`id, name, jersey_number, photo_url, teams:team_id ( name )`)
      .eq("id", playerId)
      .single()

    if (pErr || !player) {
      return NextResponse.json({ success: false, message: "Jugador no existe" }, { status: 404 })
    }

    // 2. Verificar si ya existe asistencia
    const { data: existing } = await supabase
      .from("game_attendance")
      .select("id, attended")
      .eq("game_id", Number(game_id))
      .eq("player_id", playerId)
      .maybeSingle()

    if (existing?.attended) {
      return NextResponse.json({
        success: true,
        already_registered: true,
        message: "Ya estaba registrado",
        data: { player }
      })
    }

    // 3. Registrar asistencia (usando upsert por seguridad)
    const { error: attErr } = await supabase
      .from("game_attendance")
      .upsert({
        game_id: Number(game_id),
        player_id: playerId,
        attended: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'game_id,player_id' })

    if (attErr) throw attErr

    return NextResponse.json({
      success: true,
      already_registered: false,
      message: "Asistencia registrada con éxito",
      data: { player }
    })

  } catch (error: any) {
    console.error("Scan Error:", error)
    return NextResponse.json({ success: false, message: "Error en el servidor" }, { status: 500 })
  }
}