import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function compact(s: string) {
  return norm(s).replace(/[^a-z0-9]/g, "")
}

function scoreName(candidate: string, target: string): number {
  const a = norm(candidate)
  const b = norm(target)
  if (!a || !b) return 0
  if (a === b) return 100
  if (compact(a) === compact(b)) return 95
  if (a.includes(b) || b.includes(a)) return 80
  // token overlap
  const ta = new Set(a.split(" "))
  const tb = b.split(" ")
  let hit = 0
  for (const t of tb) if (ta.has(t)) hit++
  return hit * 20
}

function bestTeam(
  teams: { id: number; name: string; category?: string }[],
  name: string,
  category?: string,
) {
  const pool = category ? teams.filter((t) => t.category === category) : teams
  let best: { id: number; name: string; category?: string } | null = null
  let bestScore = 0
  for (const t of pool) {
    const s = scoreName(t.name, name)
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }
  // fallback sin categoría si no hay buen match
  if (bestScore < 60 && category) {
    for (const t of teams) {
      const s = scoreName(t.name, name)
      if (s > bestScore) {
        bestScore = s
        best = t
      }
    }
  }
  return bestScore >= 60 ? best : null
}

/** Remapea borradores a nombres exactos de teams de la temporada activa */
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const jornada = body.jornada != null ? Number(body.jornada) : null
    const date = body.game_date ? String(body.game_date).slice(0, 10) : null
    const draftsOnly = body.drafts_only !== false

    const { data: active } = await supabase.from("seasons").select("id, year").eq("is_active", true).maybeSingle()
    if (!active?.id) {
      return NextResponse.json({ success: false, message: "No hay temporada activa" }, { status: 400 })
    }

    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name, category, season_id")
      .eq("season_id", active.id)

    if (teamsErr) {
      return NextResponse.json({ success: false, message: teamsErr.message }, { status: 500 })
    }

    let q = supabase
      .from("games")
      .select("id, home_team, away_team, category, game_date, game_time, field, jornada, is_draft, season_id")
      .eq("season_id", active.id)

    if (draftsOnly) q = q.eq("is_draft", true)
    if (jornada != null && !Number.isNaN(jornada)) q = q.eq("jornada", jornada)
    if (date) q = q.eq("game_date", date)

    const { data: games, error: gamesErr } = await q
    if (gamesErr) {
      return NextResponse.json({ success: false, message: gamesErr.message }, { status: 500 })
    }

    const report: any[] = []
    let fixed = 0

    for (const g of games || []) {
      const home = bestTeam(teams || [], g.home_team, g.category)
      const away = bestTeam(teams || [], g.away_team, g.category)
      const patch: Record<string, unknown> = {}
      if (home && home.name !== g.home_team) patch.home_team = home.name
      if (away && away.name !== g.away_team) patch.away_team = away.name

      const row = {
        id: g.id,
        before: { home: g.home_team, away: g.away_team, category: g.category },
        after: {
          home: (patch.home_team as string) || g.home_team,
          away: (patch.away_team as string) || g.away_team,
        },
        home_matched: !!home,
        away_matched: !!away,
        changed: Object.keys(patch).length > 0,
      }
      report.push(row)

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("games").update(patch).eq("id", g.id)
        if (!error) fixed++
      }
    }

    const unmatched = report.filter((r) => !r.home_matched || !r.away_matched)

    return NextResponse.json({
      success: true,
      season_id: active.id,
      checked: report.length,
      fixed,
      unmatched_count: unmatched.length,
      unmatched,
      report,
      message: `Revisados ${report.length}. Corregidos ${fixed}. Sin match: ${unmatched.length}.`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
