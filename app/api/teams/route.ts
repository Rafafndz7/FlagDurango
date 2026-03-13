import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function normalizeCategory(value: unknown): string {
  if (value === undefined || value === null) return ""
  return String(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const ids = searchParams.get("ids")
    const coach_id = searchParams.get("coach_id")

    if (id) {
      const teamId = Number.parseInt(id)
      const { data: team, error: teamErr } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle()

      if (teamErr) return NextResponse.json({ success: false, message: teamErr.message }, { status: 500 })
      if (!team) return NextResponse.json({ success: false, message: "Equipo no encontrado" }, { status: 404 })

      const { data: players, error: plErr } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("jersey_number", { ascending: true })

      if (plErr) return NextResponse.json({ success: false, message: plErr.message }, { status: 500 })

      return NextResponse.json({ success: true, data: team, players: players || [] })
    }

    if (ids) {
      const teamIds = ids
        .split(",")
        .map((id) => Number.parseInt(id.trim()))
        .filter((id) => !isNaN(id))
      if (teamIds.length === 0) {
        return NextResponse.json({ success: false, message: "IDs inválidos" }, { status: 400 })
      }

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds)
        .order("name", { ascending: true })

      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: data || [] })
    }

    if (coach_id) {
      const coachId = Number.parseInt(coach_id)
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", coachId)
        .order("name", { ascending: true })

      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data, error } = await supabase.from("teams").select("*").order("name", { ascending: true })
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data || [] })
  } catch (e) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      category,
      color1,
      color2,
      logo_url,
      is_institutional,
      coordinator_name,
      coordinator_phone,
      captain_photo_url,
      captain_name,
      captain_phone,
      coach_name,
      coach_phone,
      coach_photo_url,
      coach_id,
    } = body

    if (!name || !category) {
      return NextResponse.json({ success: false, message: "Nombre y categoría son requeridos" }, { status: 400 })
    }

    const normalizedCategory = normalizeCategory(category)

    const categoryMap: { [key: string]: string } = {
      "varonil-gold": "VG",
      "varonil-master": "VM",
      "varonil-silver": "VS",
      "varonil-cooper": "VC", // <--- NUEVA
      "femenil-gold": "FG",
      "femenil-silver": "FS",
      "femenil-cooper": "FC",
      "mixto-gold": "MG",
      "mixto-silver": "MS",
      "mixto-cooper": "MC",   // <--- NUEVA
      teens: "T",
    }

    const suffix = categoryMap[normalizedCategory] || ""
    const teamName = suffix ? `${name} ${suffix}` : name

    const base: any = {
      name: teamName,
      category: normalizedCategory,
      color1: color1 || "#3B82F6",
      color2: color2 || "#1E40AF",
      logo_url: logo_url || null,
      is_institutional: Boolean(is_institutional),
      coordinator_name: coordinator_name || null,
      coordinator_phone: coordinator_phone || null,
      captain_photo_url: captain_photo_url || null,
      paid: false,
    }

    if (captain_name !== undefined) base.captain_name = captain_name
    if (captain_phone !== undefined) base.captain_phone = captain_phone
    if (coach_name !== undefined) base.coach_name = coach_name
    if (coach_phone !== undefined) base.coach_phone = coach_phone
    if (coach_photo_url !== undefined) base.coach_photo_url = coach_photo_url
    if (coach_id !== undefined) base.coach_id = coach_id

    const { data, error } = await supabase.from("teams").insert([base]).select().single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "ID requerido" }, { status: 400 })
    }

    if (updateData.category) {
      updateData.category = normalizeCategory(updateData.category)
    }

    const { data, error } = await supabase.from("teams").update(updateData).eq("id", id).select().single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ success: false, message: "ID requerido" }, { status: 400 })

    const { error } = await supabase.from("teams").delete().eq("id", Number.parseInt(id))
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: "Equipo eliminado" })
  } catch (e) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}
