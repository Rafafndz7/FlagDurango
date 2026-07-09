import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    let seasonId = searchParams.get("season")
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }

    console.log("MVPs API - Category filter:", category)

    let query = supabase
      .from("mvps")
      .select(`
        *,
        players!mvps_player_id_fkey (
          id,
          name,
          photo_url,
          team_id,
          teams!players_team_id_fkey (
            id,
            name,
            logo_url,
            color1,
            color2,
            category
          )
        )
      `)
      .eq("season_id", seasonId)
      .order("created_at", { ascending: false })

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching MVPs:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    console.log("MVPs fetched:", data?.length || 0)

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in MVPs API:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { player_id, mvp_type, category, week_number, notes } = body
    let seasonId = body.season_id
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id
    }

    console.log("Creating MVP:", body)

    // Validaciones
    if (!player_id || !mvp_type || !category || !seasonId) {
      return NextResponse.json({ success: false, message: "Faltan campos requeridos" }, { status: 400 })
    }

    // Verificar si ya existe un MVP semanal para esta categoría y semana
    if (mvp_type === "weekly" && week_number) {
      const { data: existingMvp } = await supabase
        .from("mvps")
        .select("id")
        .eq("mvp_type", "weekly")
        .eq("category", category)
        .eq("week_number", week_number)
        .eq("season_id", seasonId)
        .single()

      if (existingMvp) {
        return NextResponse.json(
          { success: false, message: "Ya existe un MVP semanal para esta categoría y semana" },
          { status: 400 },
        )
      }
    }

    // Crear el MVP
    const { data, error } = await supabase
      .from("mvps")
      .insert({
        player_id,
        mvp_type,
        category,
        week_number: mvp_type === "weekly" ? week_number : null,
        season_id: seasonId,
        notes,
      })
      .select(`
        *,
        players!mvps_player_id_fkey (
          id,
          name,
          photo_url,
          team_id,
          teams!players_team_id_fkey (
            id,
            name,
            logo_url,
            color1,
            color2,
            category
          )
        )
      `)
      .single()

    if (error) {
      console.error("Error creating MVP:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    console.log("MVP created successfully:", data)

    return NextResponse.json({
      success: true,
      data,
      message: "MVP creado exitosamente",
    })
  } catch (error) {
    console.error("Error in MVP creation:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, message: "ID requerido" }, { status: 400 })
    }

    const { error } = await supabase.from("mvps").delete().eq("id", id)

    if (error) {
      console.error("Error deleting MVP:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "MVP eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error in MVP deletion:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
