import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import QRCode from "qrcode"

// GET - Generate QR code for a player
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get("player_id")
    const teamId = searchParams.get("team_id")
    const format = searchParams.get("format") || "dataurl" // dataurl or svg

    // If team_id is specified, return all player QRs for that team
    if (teamId) {
      const { data: players, error } = await supabase
        .from("players")
        .select(`
          id,
          name,
          jersey_number,
          position,
          photo_url,
          team_id,
          teams!players_team_id_fkey (
            id,
            name,
            category,
            logo_url,
            coach_name,
            color1,
            color2
          )
        `)
        .eq("team_id", Number(teamId))
        .order("jersey_number", { ascending: true })

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 }
        )
      }

      const playersWithQR = await Promise.all(
        (players || []).map(async (player) => {
          const qrData = JSON.stringify({
            type: "player_attendance",
            player_id: player.id,
            player_name: player.name,
            team_id: player.team_id,
            jersey_number: player.jersey_number,
          })

          const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
            errorCorrectionLevel: "M",
          })

          return {
            ...player,
            qr_code: qrDataUrl,
          }
        })
      )

      return NextResponse.json({ success: true, data: playersWithQR })
    }

    // Single player QR
    if (!playerId) {
      return NextResponse.json(
        { success: false, message: "player_id o team_id es requerido" },
        { status: 400 }
      )
    }

    const { data: player, error } = await supabase
      .from("players")
      .select(`
        id,
        name,
        jersey_number,
        position,
        photo_url,
        team_id,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url,
          coach_name
        )
      `)
      .eq("id", Number(playerId))
      .single()

    if (error || !player) {
      return NextResponse.json(
        { success: false, message: "Jugador no encontrado" },
        { status: 404 }
      )
    }

    const qrData = JSON.stringify({
      type: "player_attendance",
      player_id: player.id,
      player_name: player.name,
      team_id: player.team_id,
      jersey_number: player.jersey_number,
    })

    let qrCode: string

    if (format === "svg") {
      qrCode = await QRCode.toString(qrData, {
        type: "svg",
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
      })
    } else {
      qrCode = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...player,
        qr_code: qrCode,
      },
    })
  } catch (error: any) {
    console.error("GET /api/qr/generate error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
