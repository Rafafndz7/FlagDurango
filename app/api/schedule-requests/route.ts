import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { formatFieldName, normalizeFieldLetter } from "@/lib/schedule-slots"

function getAuthUser(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}")
  } catch {
    return null
  }
}

function isAdmin(user: any) {
  return user?.role === "admin"
}

function canRequest(user: any) {
  return user?.role === "admin" || user?.role === "coach" || user?.role === "capitan" || user?.role === "player"
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user?.role) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || (isAdmin(user) ? "pending" : undefined)

    let query = supabase
      .from("schedule_slot_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) {
      if (/does not exist/i.test(error.message)) {
        return NextResponse.json({
          success: false,
          message: "Ejecuta scripts/2026-09-schedule-drafts.sql",
          needs_migration: true,
        }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!canRequest(user)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const gameDate = String(body.game_date || "").slice(0, 10)
    const gameTime = String(body.game_time || "").slice(0, 5)
    if (!gameDate || !gameTime) {
      return NextResponse.json({ success: false, message: "Fecha y hora requeridas" }, { status: 400 })
    }

    let seasonId = body.season_id
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id
    }

    const { data, error } = await supabase
      .from("schedule_slot_requests")
      .insert({
        season_id: seasonId || null,
        team_id: body.team_id || null,
        team_name: body.team_name || null,
        requested_by_name: body.requested_by_name || user.username || user.email,
        requested_by_role: body.requested_by_role || user.role,
        game_date: gameDate,
        game_time: gameTime,
        field: body.field ? formatFieldName(normalizeFieldLetter(body.field) || body.field) : null,
        category: body.category || null,
        reason: body.reason || null,
        request_type: body.request_type || "occupy",
        related_game_id: body.related_game_id || null,
        status: "pending",
      })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!isAdmin(user)) {
      return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
    }

    const body = await req.json()
    const id = Number(body.id)
    const status = body.status
    if (!id || !["approved", "rejected", "applied", "pending"].includes(status)) {
      return NextResponse.json({ success: false, message: "id y status válidos requeridos" }, { status: 400 })
    }

    const { data: request, error: fetchErr } = await supabase
      .from("schedule_slot_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchErr || !request) {
      return NextResponse.json({ success: false, message: "Solicitud no encontrada" }, { status: 404 })
    }

    // Si se aprueba y hay related_game_id → ajustar partido; si occupy sin juego → crear draft vacío no
    if (status === "approved" && request.related_game_id) {
      const patch: Record<string, unknown> = {
        game_date: `${String(request.game_date).slice(0, 10)}T00:00:00Z`,
        game_time: String(request.game_time).slice(0, 5),
        allow_shared_slot: request.request_type === "share",
      }
      if (request.field) patch.field = request.field
      await supabase.from("games").update(patch).eq("id", request.related_game_id)
    }

    const { data, error } = await supabase
      .from("schedule_slot_requests")
      .update({
        status: status === "approved" && request.related_game_id ? "applied" : status,
        admin_notes: body.admin_notes || null,
        resolved_by: user.id || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
