import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { getStandings } from "@/lib/standings"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    let seasonId = searchParams.get("season")
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }
    if (!seasonId) {
      return NextResponse.json({ success: false, message: "No hay una temporada activa." }, { status: 400 })
    }

    const rows = await getStandings({ seasonId, category })

    return NextResponse.json({
      success: true,
      data: rows.map(({ from_games, adjustment, ...row }) => row),
    })
  } catch (error: any) {
    console.error("GET /api/stats error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
