import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

/** Recalcula team_stats (lo que usa la app) para la temporada indicada o la activa. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    let seasonId: string | null = body?.season_id || null
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }
    if (!seasonId) return NextResponse.json({ success: false, message: "No hay temporada activa" }, { status: 400 })

    const { data, error } = await supabase.rpc("refresh_team_stats", { p_season: seasonId })
    if (error) {
      const hint = /refresh_team_stats/.test(error.message) ? " (corre scripts/2026-11-09-team-stats-auto.sql)" : ""
      throw new Error(error.message + hint)
    }

    return NextResponse.json({
      success: true,
      message: "Estadísticas recalculadas",
      data: { equipos_procesados: data ?? 0 },
    })
  } catch (error: any) {
    console.error("POST /api/stats/update error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
