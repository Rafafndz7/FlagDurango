import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function getAuthUser(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}")
  } catch {
    return null
  }
}

function canManageRefs(req: NextRequest) {
  const role = getAuthUser(req)?.role
  return role === "admin" || role === "referee_coordinator"
}

export async function GET(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get("active") !== "0"

    let query = supabase.from("referee_profiles").select("*").order("name", { ascending: true })
    if (activeOnly) query = query.eq("active", true)

    const { data, error } = await query
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, message: "Nombre requerido" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("referee_profiles")
      .insert({
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        default_fee: Number(body.default_fee || 0),
        active: body.active !== false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ success: false, message: "id requerido" }, { status: 400 })
    }

    // Solo admin puede forzar fees altos sin restricción — ambos pueden editar default_fee
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) patch.name = String(body.name).trim()
    if (body.phone !== undefined) patch.phone = body.phone
    if (body.email !== undefined) patch.email = body.email
    if (body.default_fee !== undefined) patch.default_fee = Number(body.default_fee)
    if (body.active !== undefined) patch.active = Boolean(body.active)

    const { data, error } = await supabase
      .from("referee_profiles")
      .update(patch)
      .eq("id", Number(body.id))
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const id = Number(new URL(req.url).searchParams.get("id"))
    if (!id) return NextResponse.json({ success: false, message: "id requerido" }, { status: 400 })

    // Soft delete
    const { error } = await supabase
      .from("referee_profiles")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: "Árbitro desactivado" })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}
