import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "ID de usuario requerido" },
        { status: 400 }
      )
    }

    // Fetch ALL player rows for this user (one per team)
    const { data: allPlayerRows, error } = await supabase
      .from("players")
      .select(`
        *,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url
        )
      `)
      .eq("user_id", Number(userId))
      .order("created_at", { ascending: true })

    if (error || !allPlayerRows || allPlayerRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Perfil de jugador no encontrado" },
        { status: 404 }
      )
    }

    // Prefer a row that actually has a team assigned (team_id is not null)
    const player = allPlayerRows.find((p: any) => p.team_id !== null) || allPlayerRows[0]

    // Collect ALL teams the player belongs to
    const playerTeams = allPlayerRows
      .filter((p: any) => p.team_id !== null && p.teams)
      .map((p: any) => ({
        player_row_id: p.id,
        team_id: p.team_id,
        team: p.teams,
        position: p.position,
        jersey_number: p.jersey_number,
      }))

    // Mapear nombres de columnas de BD a nombres del frontend
    const mappedPlayer = {
      ...player,
      emergency_contact: player.emergency_contact_name || "",
      emergency_phone: player.emergency_contact_phone || "",
      playing_since: player.playing_since ? player.playing_since.substring(0, 4) : "",
    }

    return NextResponse.json({
      success: true,
      data: mappedPlayer,
      playerTeams,
    })
  } catch (error) {
    console.error("Error fetching player profile:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      birth_date,
      phone,
      personal_email,
      address,
      emergency_contact,
      emergency_phone,
      blood_type,
      seasons_played,
      playing_since,
      medical_conditions,
      cedula_url,
      photo_url,
    } = body

    // Mapear nombres del frontend a nombres de columnas en la BD
    const emergency_contact_name = emergency_contact
    const emergency_contact_phone = emergency_phone

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "ID de usuario requerido" },
        { status: 400 }
      )
    }

    // Verificar que el jugador existe y pertenece al usuario
    const { data: existingPlayer, error: checkError } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", Number(user_id))
      .limit(1)
      .maybeSingle()

    if (checkError || !existingPlayer) {
      return NextResponse.json(
        { success: false, message: "Jugador no encontrado" },
        { status: 404 }
      )
    }

    // Preparar datos para actualizar
    const updateData: any = {
      profile_completed: true,
    }

    if (birth_date) updateData.birth_date = birth_date
    if (phone) updateData.phone = phone
    if (personal_email) updateData.personal_email = personal_email
    if (address) updateData.address = address
    if (emergency_contact_name) updateData.emergency_contact_name = emergency_contact_name
    if (emergency_contact_phone) updateData.emergency_contact_phone = emergency_contact_phone
    if (blood_type) updateData.blood_type = blood_type
    if (seasons_played !== undefined) updateData.seasons_played = Number(seasons_played)
    if (playing_since) {
      // Si solo se envia un ano (ej: "2023"), convertir a fecha valida "2023-01-01"
      const val = playing_since.toString().trim()
      updateData.playing_since = /^\d{4}$/.test(val) ? `${val}-01-01` : val
    }
    if (medical_conditions !== undefined) updateData.medical_conditions = medical_conditions
    if (cedula_url) updateData.cedula_url = cedula_url
    if (photo_url) updateData.photo_url = photo_url

    // Asegurar que solo se envien columnas validas de la BD (nunca emergency_contact o emergency_phone)
    delete updateData.emergency_contact
    delete updateData.emergency_phone

    // Update ALL player rows for this user (they may be on multiple teams)
    const { error: updateError } = await supabase
      .from("players")
      .update(updateData)
      .eq("user_id", Number(user_id))

    if (updateError) {
      console.error("Error updating player profile:", updateError)
      return NextResponse.json(
        { success: false, message: "Error al actualizar el perfil" },
        { status: 500 }
      )
    }

    // Fetch ALL rows back to return to the frontend  
    const { data: allRows } = await supabase
      .from("players")
      .select(`
        *,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url
        )
      `)
      .eq("user_id", Number(user_id))
      .order("created_at", { ascending: true })

    const updatedPlayer = allRows?.find((p: any) => p.team_id !== null) || allRows?.[0] || null

    const playerTeams = (allRows || [])
      .filter((p: any) => p.team_id !== null && p.teams)
      .map((p: any) => ({
        player_row_id: p.id,
        team_id: p.team_id,
        team: p.teams,
        position: p.position,
        jersey_number: p.jersey_number,
      }))

    return NextResponse.json({
      success: true,
      data: updatedPlayer,
      playerTeams,
      message: "Perfil actualizado exitosamente",
    })
  } catch (error) {
    console.error("Error updating player profile:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
