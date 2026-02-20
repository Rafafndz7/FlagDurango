import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch join requests
// ?team_id=X  -> for coaches: get requests for their team
// ?player_user_id=X -> for players: get their own requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")
    const playerUserId = searchParams.get("player_user_id")

    let query = supabase
      .from("team_join_requests")
      .select(`
        *,
        teams:team_id (
          id,
          name,
          category,
          logo_url,
          color1,
          color2
        )
      `)
      .order("created_at", { ascending: false })

    if (teamId) {
      query = query.eq("team_id", Number(teamId))
    }

    if (playerUserId) {
      query = query.eq("player_user_id", Number(playerUserId))
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching join requests:", error)
      return NextResponse.json(
        { success: false, message: "Error al obtener solicitudes" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error in GET join requests:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Create a new join request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { player_user_id, player_id, team_id, player_name, position, jersey_number, phone, message } = body

    if (!player_user_id || !team_id || !player_name || !position || !jersey_number) {
      return NextResponse.json(
        { success: false, message: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    // Check the player doesn't already have a team
    if (player_id) {
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("team_id")
        .eq("id", Number(player_id))
        .single()

      if (existingPlayer?.team_id) {
        return NextResponse.json(
          { success: false, message: "Ya perteneces a un equipo" },
          { status: 400 }
        )
      }
    }

    // Check for existing pending request to this team
    const { data: existing } = await supabase
      .from("team_join_requests")
      .select("id")
      .eq("player_user_id", Number(player_user_id))
      .eq("team_id", Number(team_id))
      .eq("status", "pending")
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Ya tienes una solicitud pendiente para este equipo" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("team_join_requests")
      .insert({
        player_user_id: Number(player_user_id),
        player_id: player_id ? Number(player_id) : null,
        team_id: Number(team_id),
        player_name: player_name.trim(),
        position,
        jersey_number: Number(jersey_number),
        phone: phone || null,
        message: message || null,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating join request:", error)
      return NextResponse.json(
        { success: false, message: "Error al crear la solicitud: " + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Solicitud enviada exitosamente",
    })
  } catch (error) {
    console.error("Error in POST join request:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT: Accept or reject a join request
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, coach_user_id } = body

    if (!id || !status || !coach_user_id) {
      return NextResponse.json(
        { success: false, message: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Estado invalido" },
        { status: 400 }
      )
    }

    // Get the join request
    const { data: joinRequest, error: fetchError } = await supabase
      .from("team_join_requests")
      .select("*")
      .eq("id", Number(id))
      .single()

    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { success: false, message: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    // Verify the coach owns this team
    const { data: team } = await supabase
      .from("teams")
      .select("id, coach_id")
      .eq("id", joinRequest.team_id)
      .single()

    if (!team || team.coach_id !== Number(coach_user_id)) {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para gestionar solicitudes de este equipo" },
        { status: 403 }
      )
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from("team_join_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", Number(id))

    if (updateError) {
      console.error("Error updating join request:", updateError)
      return NextResponse.json(
        { success: false, message: "Error al actualizar la solicitud" },
        { status: 500 }
      )
    }

    // If accepted, assign the player to the team
    if (status === "accepted") {
      const updateData: Record<string, unknown> = {
        team_id: joinRequest.team_id,
        position: joinRequest.position,
        jersey_number: joinRequest.jersey_number,
      }

      if (joinRequest.player_id) {
        // Update existing player record
        const { error: playerError } = await supabase
          .from("players")
          .update(updateData)
          .eq("id", joinRequest.player_id)

        if (playerError) {
          console.error("Error updating player:", playerError)
        }
      } else if (joinRequest.player_user_id) {
        // Try to find by user_id
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("id")
          .eq("user_id", joinRequest.player_user_id)
          .maybeSingle()

        if (existingPlayer) {
          const { error: playerError } = await supabase
            .from("players")
            .update(updateData)
            .eq("id", existingPlayer.id)

          if (playerError) {
            console.error("Error updating player:", playerError)
          }
        }
      }

      // Reject all other pending requests from this player
      await supabase
        .from("team_join_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("player_user_id", joinRequest.player_user_id)
        .eq("status", "pending")
        .neq("id", Number(id))
    }

    return NextResponse.json({
      success: true,
      message: status === "accepted"
        ? "Jugador aceptado al equipo exitosamente"
        : "Solicitud rechazada",
    })
  } catch (error) {
    console.error("Error in PUT join request:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
