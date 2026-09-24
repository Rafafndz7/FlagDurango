import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("👥 Fetching players...")

    const { searchParams } = new URL(request.url)
    const teamIdsParam = searchParams.get("team_ids")
    const teamIdParam = searchParams.get("team_id")
    const userIdParam = searchParams.get("user_id")

    let query = supabase
      .from("players")
      .select(`
        id,
        name,
        jersey_number,
        position,
        photo_url,
        team_id,
        user_id,
        birth_date,
        phone,
        personal_email,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        blood_type,
        seasons_played,
        playing_since,
        medical_conditions,
        cedula_url,
        profile_completed,
        admin_verified,
        category_verified,
        created_at,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url,
          color1,
          color2
        )
      `)
      .order("name", { ascending: true })
      .limit(5000) // <-- AQUÍ ESTÁ EL CAMBIO PARA EVITAR EL LÍMITE DE 1000

    if (teamIdsParam) {
      const teamIds = teamIdsParam
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => !Number.isNaN(value))

      if (teamIds.length > 0) {
        query = query.in("team_id", teamIds)
      }
    } else if (teamIdParam) {
      const teamId = Number.parseInt(teamIdParam, 10)
      if (!Number.isNaN(teamId)) {
        query = query.eq("team_id", teamId)
      }
    }

    if (userIdParam) {
      const userId = Number.parseInt(userIdParam, 10)
      if (!Number.isNaN(userId)) {
        query = query.eq("user_id", userId)
      }
    }

    const { data: players, error } = await query

    if (error) {
      console.error("❌ Error fetching players:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error al obtener jugadores",
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`✅ Found ${players?.length || 0} players`)

    return NextResponse.json(
      {
        success: true,
        data: players || [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("💥 Error in players API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Bulk: { bulk: true, team_id, players: [{ name, jersey_number?, position? }] }
    if (body.bulk === true) {
      const teamId = Number(body.team_id)
      const list = Array.isArray(body.players) ? body.players : []
      if (!teamId || list.length === 0) {
        return NextResponse.json(
          { success: false, message: "team_id y players[] son requeridos" },
          { status: 400 },
        )
      }

      const created: any[] = []
      const errors: string[] = []

      for (const raw of list) {
        const name = String(raw?.name || "").trim()
        if (!name) {
          errors.push("Fila sin nombre omitida")
          continue
        }
        const jersey =
          raw.jersey_number !== undefined && raw.jersey_number !== null && raw.jersey_number !== ""
            ? Number(raw.jersey_number)
            : null

        if (jersey !== null && !Number.isNaN(jersey)) {
          const { data: existing } = await supabase
            .from("players")
            .select("id")
            .eq("team_id", teamId)
            .eq("jersey_number", jersey)
          if (existing && existing.length > 0) {
            errors.push(`#${jersey} ${name}: número ocupado`)
            continue
          }
        }

        const { data: newPlayer, error } = await supabase
          .from("players")
          .insert({
            name,
            jersey_number: jersey !== null && !Number.isNaN(jersey) ? jersey : null,
            position: raw.position || null,
            team_id: teamId,
            photo_url: null,
          })
          .select("id, name, jersey_number, position, team_id")
          .single()

        if (error) {
          errors.push(`${name}: ${error.message}`)
        } else if (newPlayer) {
          created.push(newPlayer)
        }
      }

      return NextResponse.json({
        success: created.length > 0,
        data: created,
        created: created.length,
        errors,
        message:
          created.length > 0
            ? `${created.length} jugador(es) creados${errors.length ? `, ${errors.length} con error` : ""}`
            : errors[0] || "No se creó ningún jugador",
      }, { status: created.length > 0 ? 201 : 400 })
    }

    console.log("👤 Creating player with data:", body)

    const { name, jersey_number, position, team_id, photo_url } = body

    if (!name || !team_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Nombre y equipo son requeridos",
        },
        { status: 400 },
      )
    }

    // Verificar si ya existe un jugador con ese número en el mismo equipo
    if (jersey_number) {
      const { data: existing, error: checkError } = await supabase
        .from("players")
        .select("id")
        .eq("team_id", Number(team_id))
        .eq("jersey_number", Number(jersey_number))

      if (checkError) {
        console.error("Error checking existing player:", checkError)
      } else if (existing && existing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Ya existe un jugador con el número ${jersey_number} en este equipo`,
          },
          { status: 400 },
        )
      }
    }

    const { data: newPlayer, error } = await supabase
      .from("players")
      .insert({
        name: name.trim(),
        jersey_number: jersey_number ? Number(jersey_number) : null,
        position: position || null,
        team_id: Number(team_id),
        photo_url: photo_url || null,
      })
      .select(`
        id,
        name,
        jersey_number,
        position,
        photo_url,
        team_id,
        created_at,
        teams!players_team_id_fkey (
          id,
          name,
          category,
          logo_url
        )
      `)
      .single()

    if (error) {
      console.error("❌ Error creating player:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error al crear jugador",
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Player created successfully:", newPlayer.id)

    return NextResponse.json({
      success: true,
      data: newPlayer,
      message: "Jugador creado exitosamente",
    })
  } catch (error) {
    console.error("💥 Error in player creation:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Updating player with data:", body)

    const { id, name, jersey_number, position, photo_url, team_id, admin_verified, category_verified } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID del jugador es requerido",
        },
        { status: 400 },
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (jersey_number !== undefined) updateData.jersey_number = jersey_number ? Number(jersey_number) : null
    if (position !== undefined) updateData.position = position || null
    if (photo_url !== undefined) updateData.photo_url = photo_url || null
    if (team_id !== undefined) updateData.team_id = team_id === null || team_id === "" ? null : Number(team_id)
    if (admin_verified !== undefined) updateData.admin_verified = admin_verified
    if (category_verified !== undefined) updateData.category_verified = category_verified

    const { data: updatedPlayer, error } = await supabase
      .from("players")
      .update(updateData)
      .eq("id", Number(id))
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
          logo_url
        )
      `)
      .single()

    if (error) {
      console.error("❌ Error updating player:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error al actualizar jugador",
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Player updated successfully")

    return NextResponse.json({
      success: true,
      data: updatedPlayer,
      message: "Jugador actualizado exitosamente",
    })
  } catch (error) {
    console.error("💥 Error in player update:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID del jugador es requerido",
        },
        { status: 400 },
      )
    }

    console.log("🗑️ Deleting player:", id)

    const { error } = await supabase.from("players").delete().eq("id", Number(id))

    if (error) {
      console.error("❌ Error deleting player:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error al eliminar jugador",
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Player deleted successfully")

    return NextResponse.json({
      success: true,
      message: "Jugador eliminado exitosamente",
    })
  } catch (error) {
    console.error("💥 Error in player deletion:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
