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

// Helper: determine category branch
function getCategoryBranch(category: string): string {
  if (!category) return "unknown"
  const cat = category.toLowerCase()
  if (cat.startsWith("femenil")) return "femenil"
  if (cat.startsWith("varonil")) return "varonil"
  if (cat.startsWith("mixto")) return "mixto"
  if (cat.startsWith("teens")) return "teens"
  return "unknown"
}

// Helper: determine if transfer requires coordinator approval
function requiresCoordinatorApproval(fromCategory: string, toCategory: string): boolean {
  const fromBranch = getCategoryBranch(fromCategory)
  const toBranch = getCategoryBranch(toCategory)
  // Same branch transfers need coordinator + both captains approval
  // e.g. femenil->femenil, varonil->varonil, mixto->mixto
  return fromBranch === toBranch
}

// POST: Create a new join request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      player_user_id, player_id, team_id, player_name, position,
      jersey_number, phone, message,
      is_transfer, from_team_id
    } = body

    if (!player_user_id || !team_id || !player_name || !position || !jersey_number) {
      return NextResponse.json(
        { success: false, message: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    // Check if the player already belongs to this specific team (by user_id or name)
    {
      let alreadyOnTeam = false

      // Check by user_id
      const { data: byUserId } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", Number(player_user_id))
        .eq("team_id", Number(team_id))
        .maybeSingle()

      if (byUserId) alreadyOnTeam = true

      // Fallback: check by name
      if (!alreadyOnTeam) {
        const { data: byName } = await supabase
          .from("players")
          .select("id")
          .ilike("name", player_name.trim())
          .eq("team_id", Number(team_id))
          .maybeSingle()

        if (byName) alreadyOnTeam = true
      }

      if (alreadyOnTeam) {
        return NextResponse.json(
          { success: false, message: "Ya perteneces a este equipo." },
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

    // Determine if coordinator approval is needed for transfers
    let needsCoordinatorApproval = false
    let fromTeamCategory = null
    let toTeamCategory = null

    if (is_transfer && from_team_id) {
      // Get both team categories
      const { data: fromTeam } = await supabase
        .from("teams")
        .select("category")
        .eq("id", Number(from_team_id))
        .single()

      const { data: toTeam } = await supabase
        .from("teams")
        .select("category")
        .eq("id", Number(team_id))
        .single()

      fromTeamCategory = fromTeam?.category || null
      toTeamCategory = toTeam?.category || null

      if (fromTeamCategory && toTeamCategory) {
        needsCoordinatorApproval = requiresCoordinatorApproval(fromTeamCategory, toTeamCategory)
      }
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
        status: needsCoordinatorApproval ? "pending_coordinator" : "pending",
        is_transfer: is_transfer || false,
        from_team_id: from_team_id ? Number(from_team_id) : null,
        requires_coordinator_approval: needsCoordinatorApproval,
      })
      .select()
      .single()

    if (error) {
      // If columns don't exist yet, fallback to basic insert
      if (error.message?.includes("column") || error.code === "PGRST204") {
        const { data: fallbackData, error: fallbackError } = await supabase
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

        if (fallbackError) {
          console.error("Error creating join request (fallback):", fallbackError)
          return NextResponse.json(
            { success: false, message: "Error al crear la solicitud: " + fallbackError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: fallbackData,
          message: is_transfer
            ? "Solicitud de transferencia enviada exitosamente"
            : "Solicitud enviada exitosamente",
        })
      }

      console.error("Error creating join request:", error)
      return NextResponse.json(
        { success: false, message: "Error al crear la solicitud: " + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: needsCoordinatorApproval
        ? "Solicitud de transferencia enviada. Requiere aprobacion del coordinador de liga y ambos capitanes."
        : is_transfer
          ? "Solicitud de transferencia enviada exitosamente"
          : "Solicitud enviada exitosamente",
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
      const isTransfer = joinRequest.is_transfer || false

      // --- Robust deduplication: check by user_id OR by player_name + team_id ---
      let existingTeamPlayer: Record<string, any> | null = null

      // 1. Check by user_id (if the player already has a linked account)
      if (joinRequest.player_user_id) {
        const { data } = await supabase
          .from("players")
          .select("id, user_id")
          .eq("user_id", joinRequest.player_user_id)
          .eq("team_id", joinRequest.team_id)
          .maybeSingle()
        existingTeamPlayer = data
      }

      // 2. Fallback: check by player_name + team_id (covers coach-added players without user_id)
      if (!existingTeamPlayer) {
        const { data } = await supabase
          .from("players")
          .select("id, user_id")
          .ilike("name", joinRequest.player_name.trim())
          .eq("team_id", joinRequest.team_id)
          .maybeSingle()
        existingTeamPlayer = data
      }

      if (existingTeamPlayer) {
        // Already on this team -- just update position/jersey and ensure user_id is linked
        const updatePayload: Record<string, any> = {
          position: joinRequest.position,
          jersey_number: joinRequest.jersey_number,
        }
        if (!existingTeamPlayer.user_id && joinRequest.player_user_id) {
          updatePayload.user_id = joinRequest.player_user_id
        }
        await supabase
          .from("players")
          .update(updatePayload)
          .eq("id", existingTeamPlayer.id)
      } else if (isTransfer && joinRequest.player_id) {
        // Transfer: update the existing player record to new team
        const { error: playerError } = await supabase
          .from("players")
          .update({
            team_id: joinRequest.team_id,
            position: joinRequest.position,
            jersey_number: joinRequest.jersey_number,
          })
          .eq("id", joinRequest.player_id)

        if (playerError) {
          console.error("Error updating player for transfer:", playerError)
        }
      } else {
        // New join to additional team: copy ALL profile fields from the original player record
        let originalPlayer: Record<string, any> | null = null

        // Try by player_id first
        if (joinRequest.player_id) {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("id", joinRequest.player_id)
            .maybeSingle()
          originalPlayer = data
        }

        // Fallback: find any existing player row for this user
        if (!originalPlayer && joinRequest.player_user_id) {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("user_id", joinRequest.player_user_id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()
          originalPlayer = data
        }

        // Build the new record copying every profile field from the original
        const newRecord: Record<string, any> = {
          name: originalPlayer?.name || joinRequest.player_name,
          team_id: joinRequest.team_id,
          position: joinRequest.position,
          jersey_number: joinRequest.jersey_number,
          user_id: originalPlayer?.user_id ?? joinRequest.player_user_id ?? null,
          photo_url: originalPlayer?.photo_url || null,
          phone: originalPlayer?.phone || null,
          personal_email: originalPlayer?.personal_email || null,
          birth_date: originalPlayer?.birth_date || null,
          address: originalPlayer?.address || null,
          emergency_contact_name: originalPlayer?.emergency_contact_name || null,
          emergency_contact_phone: originalPlayer?.emergency_contact_phone || null,
          blood_type: originalPlayer?.blood_type || null,
          seasons_played: originalPlayer?.seasons_played ?? null,
          playing_since: originalPlayer?.playing_since || null,
          medical_conditions: originalPlayer?.medical_conditions || null,
          cedula_url: originalPlayer?.cedula_url || null,
          profile_completed: originalPlayer?.profile_completed || false,
        }

        const { error: createError } = await supabase
          .from("players")
          .insert(newRecord)

        if (createError) {
          console.error("Error creating player record for new team:", createError)
        }
      }

      // Do NOT reject other pending requests - players can be on multiple teams
    }

    const isTransfer = joinRequest.is_transfer || false
    return NextResponse.json({
      success: true,
      message: status === "accepted"
        ? isTransfer
          ? "Transferencia completada exitosamente"
          : "Jugador aceptado al equipo exitosamente"
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
