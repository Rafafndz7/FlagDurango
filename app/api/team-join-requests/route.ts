import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendExpoNotification } from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch join requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")
    const playerUserId = searchParams.get("player_user_id")
    const seasonId = searchParams.get("season") || searchParams.get("season_id")

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
          color2,
          season_id,
          seasons (
            id,
            name,
            year,
            is_active
          )
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

    let rows = data || []
    if (seasonId) {
      rows = rows.filter((row: any) => row.teams?.season_id === seasonId)
    }

    // Facilita consumo en app/web: temporada aplanada en la solicitud
    const enriched = rows.map((row: any) => ({
      ...row,
      season_id: row.teams?.season_id || null,
      season_name: row.teams?.seasons?.name || null,
      season_year: row.teams?.seasons?.year || null,
      season_is_active: row.teams?.seasons?.is_active ?? null,
    }))

    return NextResponse.json({ success: true, data: enriched })
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
  return fromBranch === toBranch
}

/**
 * Si el team_id apunta a un equipo de temporada vieja, redirige al clon
 * más reciente de la temporada activa (mismo nombre + categoría, preferible mismo coach).
 */
async function resolveToActiveSeasonTeam(requestedTeamId: number) {
  const { data: requestedTeam, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", requestedTeamId)
    .maybeSingle()

  if (error || !requestedTeam) {
    return { team: null as any, activeSeason: null as any, remapped: false }
  }

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name, year, is_active")
    .eq("is_active", true)
    .maybeSingle()

  if (!activeSeason) {
    return { team: requestedTeam, activeSeason: null, remapped: false }
  }

  if (requestedTeam.season_id === activeSeason.id) {
    return { team: requestedTeam, activeSeason, remapped: false }
  }

  let activeCloneQuery = supabase
    .from("teams")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("name", requestedTeam.name)
    .eq("category", requestedTeam.category)
    .order("id", { ascending: false })
    .limit(1)

  if (requestedTeam.coach_id) {
    activeCloneQuery = activeCloneQuery.eq("coach_id", requestedTeam.coach_id)
  }

  const { data: activeClone } = await activeCloneQuery.maybeSingle()

  if (activeClone) {
    return { team: activeClone, activeSeason, remapped: true }
  }

  // Fallback sin filtrar por coach (por si el coach_id cambió)
  const { data: byName } = await supabase
    .from("teams")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("name", requestedTeam.name)
    .eq("category", requestedTeam.category)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byName) {
    return { team: byName, activeSeason, remapped: true }
  }

  // No hay clon en activa: mantener el solicitado (admin puede manejarlo)
  return { team: requestedTeam, activeSeason, remapped: false }
}

async function assignPlayerToTeam(joinRequest: Record<string, any>) {
  const isTransfer = joinRequest.is_transfer || false
  let existingTeamPlayer: Record<string, any> | null = null

  const { data: teamPlayers } = await supabase
    .from("players")
    .select("jersey_number")
    .eq("team_id", joinRequest.team_id)

  const takenNumbers = teamPlayers?.map((p) => p.jersey_number).filter((n) => n !== null) || []
  let finalJerseyNumber = joinRequest.jersey_number

  if (takenNumbers.includes(finalJerseyNumber)) {
    for (let i = 1; i <= 99; i++) {
      if (!takenNumbers.includes(i)) {
        finalJerseyNumber = i
        break
      }
    }
  }

  if (joinRequest.player_user_id) {
    const { data } = await supabase
      .from("players")
      .select("id, user_id")
      .eq("user_id", joinRequest.player_user_id)
      .eq("team_id", joinRequest.team_id)
      .maybeSingle()
    existingTeamPlayer = data
  }

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
    const updatePayload: Record<string, any> = {
      position: joinRequest.position,
      jersey_number: finalJerseyNumber,
    }
    if (!existingTeamPlayer.user_id && joinRequest.player_user_id) {
      updatePayload.user_id = joinRequest.player_user_id
    }
    await supabase.from("players").update(updatePayload).eq("id", existingTeamPlayer.id)
  } else if (isTransfer && joinRequest.player_id) {
    const { error: playerError } = await supabase
      .from("players")
      .update({
        team_id: joinRequest.team_id,
        position: joinRequest.position,
        jersey_number: finalJerseyNumber,
      })
      .eq("id", joinRequest.player_id)

    if (playerError) {
      console.error("Error updating player for transfer:", playerError)
    }
  } else {
    let orphanRow: Record<string, any> | null = null
    if (joinRequest.player_user_id) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", joinRequest.player_user_id)
        .is("team_id", null)
        .limit(1)
        .maybeSingle()
      orphanRow = data
    }

    if (orphanRow) {
      await supabase
        .from("players")
        .update({
          team_id: joinRequest.team_id,
          position: joinRequest.position,
          jersey_number: finalJerseyNumber,
        })
        .eq("id", orphanRow.id)
    } else {
      let originalPlayer: Record<string, any> | null = null

      if (joinRequest.player_id) {
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("id", joinRequest.player_id)
          .maybeSingle()
        originalPlayer = data
      }

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

      const newRecord: Record<string, any> = {
        name: originalPlayer?.name || joinRequest.player_name,
        team_id: joinRequest.team_id,
        position: joinRequest.position,
        jersey_number: finalJerseyNumber,
        user_id: originalPlayer?.user_id ?? joinRequest.player_user_id ?? null,
        photo_url: originalPlayer?.photo_url || null,
        phone: originalPlayer?.phone || joinRequest.phone || null,
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

      const { error: createError } = await supabase.from("players").insert(newRecord)
      if (createError) {
        console.error("Error creating player record for new team:", createError)
        throw createError
      }
    }
  }
}

// POST: Create a new join request (auto-aceptada salvo transferencias que requieren coordinador)
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

    // Redirigir a equipo de temporada activa si mandaron un team_id antiguo
    const { team: resolvedTeam, remapped } = await resolveToActiveSeasonTeam(Number(team_id))
    if (!resolvedTeam) {
      return NextResponse.json({ success: false, message: "Equipo no encontrado" }, { status: 404 })
    }
    const resolvedTeamId = Number(resolvedTeam.id)

    // Check if the player already belongs to this specific (resolved) team
    let alreadyOnTeam = false
    const { data: byUserId } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", Number(player_user_id))
      .eq("team_id", resolvedTeamId)
      .maybeSingle()

    if (byUserId) alreadyOnTeam = true

    if (!alreadyOnTeam) {
      const { data: byName } = await supabase
        .from("players")
        .select("id")
        .ilike("name", player_name.trim())
        .eq("team_id", resolvedTeamId)
        .maybeSingle()

      if (byName) alreadyOnTeam = true
    }

    if (alreadyOnTeam) {
      return NextResponse.json(
        { success: false, message: "Ya perteneces a este equipo." },
        { status: 400 }
      )
    }

    // Solicitudes previas del mismo jugador al mismo equipo (cualquier estado)
    const { data: existingRows } = await supabase
      .from("team_join_requests")
      .select("*")
      .eq("player_user_id", Number(player_user_id))
      .eq("team_id", resolvedTeamId)
      .order("created_at", { ascending: false })

    const existingPending = (existingRows || []).find(
      (r) => r.status === "pending" || r.status === "pending_coordinator",
    )
    if (existingPending) {
      return NextResponse.json(
        { success: false, message: "Ya tienes una solicitud pendiente para este equipo" },
        { status: 400 }
      )
    }

    const reusable = (existingRows || []).find(
      (r) => r.status === "released" || r.status === "rejected",
    )

    // Determine if coordinator approval is needed for transfers
    let needsCoordinatorApproval = false
    let fromTeamCategory = null
    let toTeamCategory = null

    if (is_transfer && from_team_id) {
      const { data: fromTeam } = await supabase.from("teams").select("category").eq("id", Number(from_team_id)).single()
      fromTeamCategory = fromTeam?.category || null
      toTeamCategory = resolvedTeam.category || null

      if (fromTeamCategory && toTeamCategory) {
        needsCoordinatorApproval = requiresCoordinatorApproval(fromTeamCategory, toTeamCategory)
      }
    }

    const initialStatus = needsCoordinatorApproval ? "pending_coordinator" : "accepted"

    const requestPayload = {
      player_user_id: Number(player_user_id),
      player_id: player_id ? Number(player_id) : null,
      team_id: resolvedTeamId,
      player_name: player_name.trim(),
      position,
      jersey_number: Number(jersey_number),
      phone: phone || null,
      message: message || null,
      status: initialStatus,
      is_transfer: is_transfer || false,
      from_team_id: from_team_id ? Number(from_team_id) : null,
      requires_coordinator_approval: needsCoordinatorApproval,
      updated_at: new Date().toISOString(),
    }

    let data: any = null
    let error: any = null

    if (reusable) {
      // Tras baja (released) o rechazo: reutilizar la fila y permitir reingreso
      const result = await supabase
        .from("team_join_requests")
        .update(requestPayload)
        .eq("id", reusable.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("team_join_requests")
        .insert(requestPayload)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error("Error creating join request:", error)
      return NextResponse.json(
        { success: false, message: "Error al crear la solicitud: " + error.message },
        { status: 500 }
      )
    }

    const { data: teamData } = await supabaseAdmin
      .from("teams")
      .select("coach_id, name")
      .eq("id", resolvedTeamId)
      .single()

    if (!needsCoordinatorApproval) {
      try {
        await assignPlayerToTeam(data)
      } catch (assignError) {
        console.error("Error auto-aceptando jugador:", assignError)
        return NextResponse.json(
          { success: false, message: "Solicitud creada pero no se pudo agregar al roster" },
          { status: 500 }
        )
      }

      if (player_user_id) {
        try {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("expo_push_token")
            .eq("id", Number(player_user_id))
            .single()

          if (userData?.expo_push_token) {
            await sendExpoNotification(userData.expo_push_token, {
              title: "¡Bienvenido al equipo! 🎉",
              body: `Ya formas parte de ${teamData?.name || "tu nuevo equipo"}.`,
              data: { screen: "dashboard" },
            })
          }
        } catch (pushError) {
          console.error("Error enviando push al jugador:", pushError)
        }
      }

      if (teamData?.coach_id) {
        try {
          const { data: coachData } = await supabaseAdmin
            .from("users")
            .select("expo_push_token")
            .eq("id", teamData.coach_id)
            .single()

          if (coachData?.expo_push_token) {
            await sendExpoNotification(coachData.expo_push_token, {
              title: "Nuevo jugador en el roster 🏈",
              body: `${player_name.trim()} se unió automáticamente a ${teamData.name}.`,
              data: { screen: "coachDashboard", tab: "players" },
            })
          }
        } catch (pushError) {
          console.error("Error enviando push al coach:", pushError)
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...data,
          remapped_to_active_season: remapped,
          resolved_team_id: resolvedTeamId,
        },
        message: is_transfer
          ? "Transferencia completada automáticamente"
          : remapped
            ? `Te uniste al equipo de la temporada activa (${resolvedTeam.name})`
            : "Te uniste al equipo exitosamente",
      })
    }

    // Transferencia que requiere coordinador: notificar al coach
    try {
      if (teamData?.coach_id) {
        const { data: coachData } = await supabaseAdmin
          .from("users")
          .select("expo_push_token")
          .eq("id", teamData.coach_id)
          .single()

        if (coachData?.expo_push_token) {
          await sendExpoNotification(coachData.expo_push_token, {
            title: "Solicitud de transferencia 🏈",
            body: `${player_name.trim()} solicitó transferirse a ${teamData.name}. Requiere aprobación del coordinador.`,
            data: { screen: "coachDashboard", tab: "solicitudes" },
          })
        }
      }
    } catch (pushError) {
      console.error("Error enviando push notification al coach:", pushError)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        remapped_to_active_season: remapped,
        resolved_team_id: resolvedTeamId,
      },
      message: "Solicitud de transferencia enviada. Requiere aprobación del coordinador de liga y ambos capitanes.",
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

    const { data: team } = await supabase
      .from("teams")
      .select("id, coach_id, name")
      .eq("id", joinRequest.team_id)
      .single()

    if (!team || team.coach_id !== Number(coach_user_id)) {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para gestionar solicitudes de este equipo" },
        { status: 403 }
      )
    }

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

    if (status === "accepted") {
      try {
        // Si la solicitud apunta a equipo de temporada vieja, moverla al clon activo
        const { team: resolvedTeam, remapped } = await resolveToActiveSeasonTeam(Number(joinRequest.team_id))
        if (resolvedTeam && remapped && Number(resolvedTeam.id) !== Number(joinRequest.team_id)) {
          await supabase
            .from("team_join_requests")
            .update({ team_id: resolvedTeam.id, updated_at: new Date().toISOString() })
            .eq("id", Number(id))
          joinRequest.team_id = resolvedTeam.id
        }
        await assignPlayerToTeam(joinRequest)
      } catch (assignError) {
        console.error("Error assigning player on accept:", assignError)
        return NextResponse.json(
          { success: false, message: "Error al agregar el jugador al roster" },
          { status: 500 }
        )
      }
    }

    // -------------------------------------------------------------------
    // ENVIAR NOTIFICACIÓN PUSH AL JUGADOR DESDE EXPO
    // -------------------------------------------------------------------
    if (joinRequest.player_user_id) {
      try {
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("expo_push_token")
          .eq("id", joinRequest.player_user_id)
          .single();

        if (userData?.expo_push_token) {
          const title = status === "accepted" ? "¡Felicidades! 🎉" : "Actualización de Solicitud";
          const body = status === "accepted"
            ? `Has sido aceptado en el equipo ${team.name}. ¡Bienvenido!`
            : `Tu solicitud para unirte a ${team.name} ha sido rechazada.`;

          await sendExpoNotification(userData.expo_push_token, {
            title,
            body,
            data: { screen: "dashboard" }
          });
        }
      } catch (pushError) {
        console.error("Error enviando push notification:", pushError);
      }
    }
    // -------------------------------------------------------------------

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
