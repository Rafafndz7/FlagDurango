import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function isAdmin(request: NextRequest) {
  try {
    return JSON.parse(request.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch { return false }
}

export async function GET() {
  const { data, error } = await supabase
    .from("seasons")
    .select("*, games(count)")
    .order("year", { ascending: false })
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({
    success: true,
    data: (data || []).map(({ games, ...season }) => ({ ...season, game_count: games?.[0]?.count || 0 })),
  })
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "Solo administradores." }, { status: 403 })
  const body = await request.json()
  if (!body.name?.trim() || !Number.isInteger(Number(body.year))) {
    return NextResponse.json({ success: false, message: "Nombre y año son obligatorios." }, { status: 400 })
  }
  const { data, error } = await supabase.from("seasons").insert({
    name: body.name.trim(),
    year: Number(body.year),
    status: body.is_active ? "active" : (body.status || "draft"),
    is_active: false,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
  }).select().single()
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  if (body.is_active) await supabase.rpc("set_active_season", { target_id: data.id })
  return NextResponse.json({ success: true, data })
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "Solo administradores." }, { status: 403 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ success: false, message: "ID requerido." }, { status: 400 })
  if (body.action === "activate") {
    const { data, error } = await supabase.rpc("set_active_season", { target_id: body.id })
    return NextResponse.json(error ? { success: false, message: error.message } : { success: true, data }, { status: error ? 500 : 200 })
  }
  const patch = body.action === "archive"
    ? { status: "archived", is_active: false, updated_at: new Date().toISOString() }
    : { name: body.name, year: Number(body.year), status: body.status, start_date: body.start_date || null, end_date: body.end_date || null, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from("seasons").update(patch).eq("id", body.id).select().single()
  return NextResponse.json(error ? { success: false, message: error.message } : { success: true, data }, { status: error ? 500 : 200 })
}
