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

async function syncGameRefereeNames(gameId: number) {
  const { data: assignments } = await supabase
    .from("game_referee_assignments")
    .select("role, referee_profiles(name)")
    .eq("game_id", gameId)

  const names: Record<string, string | null> = {
    referee1: null,
    referee2: null,
    referee3: null,
  }

  for (const row of assignments || []) {
    const name = (row as any).referee_profiles?.name || null
    if (row.role === "referee1") names.referee1 = name
    if (row.role === "referee2") names.referee2 = name
    if (row.role === "referee3") names.referee3 = name
  }

  await supabase
    .from("games")
    .update({
      referee1: names.referee1,
      referee2: names.referee2,
    })
    .eq("id", gameId)
}

export async function GET(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const seasonIdParam = searchParams.get("season")
    const date = searchParams.get("date")
    const category = searchParams.get("category")
    const unassignedOnly = searchParams.get("unassigned") === "1"

    let seasonId = seasonIdParam
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }

    let gamesQuery = supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true })

    if (seasonId) gamesQuery = gamesQuery.eq("season_id", seasonId)
    if (date) {
      // game_date puede ser date o timestamptz
      gamesQuery = gamesQuery
        .gte("game_date", `${date}T00:00:00`)
        .lte("game_date", `${date}T23:59:59.999`)
    }
    if (category) gamesQuery = gamesQuery.eq("category", category)

    const { data: games, error: gamesError } = await gamesQuery
    if (gamesError) {
      return NextResponse.json({ success: false, message: gamesError.message }, { status: 500 })
    }

    const gameIds = (games || []).map((g) => g.id)
    let assignments: any[] = []
    if (gameIds.length > 0) {
      const { data } = await supabase
        .from("game_referee_assignments")
        .select("*, referee_profiles(*)")
        .in("game_id", gameIds)
      assignments = data || []
    }

    const byGame = new Map<number, any[]>()
    for (const a of assignments) {
      const list = byGame.get(a.game_id) || []
      list.push(a)
      byGame.set(a.game_id, list)
    }

    let rows = (games || []).map((game) => ({
      game,
      assignments: byGame.get(game.id) || [],
    }))

    if (unassignedOnly) {
      rows = rows.filter((r) => r.assignments.length < 2)
    }

    // Totales por árbitro
    const earnings: Record<string, { referee_id: number; name: string; total: number; games: number }> = {}
    for (const a of assignments) {
      const ref = a.referee_profiles
      if (!ref) continue
      const key = String(a.referee_id)
      if (!earnings[key]) {
        earnings[key] = { referee_id: a.referee_id, name: ref.name, total: 0, games: 0 }
      }
      earnings[key].total += Number(a.fee || 0)
      earnings[key].games += 1
    }

    return NextResponse.json({
      success: true,
      data: rows,
      earnings: Object.values(earnings),
      season_id: seasonId,
    })
  } catch (error) {
    console.error("GET game-referee-assignments", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!canManageRefs(req)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const gameId = Number(body.game_id)
    const role = body.role
    if (!gameId || !["referee1", "referee2", "referee3"].includes(role)) {
      return NextResponse.json({ success: false, message: "game_id y role válidos requeridos" }, { status: 400 })
    }

    // Limpiar slot
    if (!body.referee_id) {
      await supabase.from("game_referee_assignments").delete().eq("game_id", gameId).eq("role", role)
      await syncGameRefereeNames(gameId)
      return NextResponse.json({ success: true, message: "Asignación eliminada" })
    }

    const refereeId = Number(body.referee_id)
    let fee = body.fee
    if (fee === undefined || fee === null || fee === "") {
      const { data: profile } = await supabase
        .from("referee_profiles")
        .select("default_fee")
        .eq("id", refereeId)
        .maybeSingle()
      fee = profile?.default_fee ?? 0
    }

    const { data: existing } = await supabase
      .from("game_referee_assignments")
      .select("id")
      .eq("game_id", gameId)
      .eq("role", role)
      .maybeSingle()

    let data
    let error
    if (existing) {
      const result = await supabase
        .from("game_referee_assignments")
        .update({
          referee_id: refereeId,
          fee: Number(fee),
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*, referee_profiles(*)")
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("game_referee_assignments")
        .insert({
          game_id: gameId,
          referee_id: refereeId,
          role,
          fee: Number(fee),
          notes: body.notes || null,
        })
        .select("*, referee_profiles(*)")
        .single()
      data = result.data
      error = result.error
    }

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    await syncGameRefereeNames(gameId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("PUT game-referee-assignments", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}
