import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { resolveTeamAlias } from "@/lib/team-aliases-otono-2026"

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
  const ta = new Set(a.split(" ").filter(Boolean))
  const tb = b.split(" ").filter(Boolean)
  let hit = 0
  for (const t of tb) if (ta.has(t)) hit++
  if (tb.length && hit === tb.length) return 75
  return hit * 25
}

function findExact(teams: { id: number; name: string; category?: string }[], name: string) {
  const n = norm(name)
  const c = compact(name)
  return (
    teams.find((t) => norm(t.name) === n) ||
    teams.find((t) => compact(t.name) === c) ||
    null
  )
}

function bestTeam(
  teams: { id: number; name: string; category?: string }[],
  name: string,
  category?: string,
) {
  // 1) Alias oficial Otoño 2026 (busca en todos los teams de la temporada)
  if (category) {
    const aliased = resolveTeamAlias(category, name)
    if (aliased) {
      const exact = findExact(teams, aliased)
      if (exact) return exact
    }
  }

  // 2) Exacto en categoría
  const pool = category ? teams.filter((t) => t.category === category) : teams
  const exactInPool = findExact(pool, name)
  if (exactInPool) return exactInPool

  // 3) Fuzzy en categoría
  let best: { id: number; name: string; category?: string } | null = null
  let bestScore = 0
  for (const t of pool) {
    const s = scoreName(t.name, name)
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }
  if (bestScore >= 70) return best

  // 4) Fuzzy global
  for (const t of teams) {
    const s = scoreName(t.name, name)
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }
  return bestScore >= 75 ? best : null
}

/** Remapea partidos a nombres exactos de teams de la temporada activa */
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const jornada = body.jornada != null ? Number(body.jornada) : null
    const date = body.game_date ? String(body.game_date).slice(0, 10) : null
    const draftsOnly = body.drafts_only === true

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
      // Si el alias resuelve a otro category (Anti✦Hero), también actualiza category del partido
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
        home_exists: home ? true : false,
        away_exists: away ? true : false,
        changed: Object.keys(patch).length > 0,
      }
      report.push(row)

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("games").update(patch).eq("id", g.id)
        if (!error) fixed++
      }
    }

    const unmatched = report.filter((r) => !r.home_matched || !r.away_matched)
    const stillWrong = report.filter((r) => {
      const hOk = (teams || []).some((t) => t.name === r.after.home)
      const aOk = (teams || []).some((t) => t.name === r.after.away)
      return !hOk || !aOk
    })

    return NextResponse.json({
      success: true,
      season_id: active.id,
      checked: report.length,
      fixed,
      unmatched_count: unmatched.length,
      still_wrong_count: stillWrong.length,
      unmatched,
      still_wrong: stillWrong,
      report,
      message: `Revisados ${report.length}. Corregidos ${fixed}. Sin match: ${unmatched.length}. Aún no existen en teams: ${stillWrong.length}.`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
