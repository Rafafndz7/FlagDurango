import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import {
  ADJUSTABLE_FIELDS,
  gameCountsForStandings,
  getStandings,
  type StandingsGame,
} from "@/lib/standings"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

async function activeSeason() {
  const { data } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle()
  return data as { id: string; name: string } | null
}

/**
 * GET ?category=slug → tabla de esa categoría (igual a la pública) con lo que sale de partidos y los ajustes.
 * GET ?team_id=N     → equipo, sus partidos de la temporada y su fila en la tabla.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa" }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("team_id")

    const { data: seasonTeams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, category, status")
      .eq("season_id", season.id)
      .order("name")
    if (teamsError) throw new Error(teamsError.message)

    if (teamId) {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", Number(teamId))
        .eq("season_id", season.id)
        .maybeSingle()
      if (teamError) throw new Error(teamError.message)
      if (!team) {
        return NextResponse.json({ success: false, message: "Equipo no encontrado en la temporada activa" }, { status: 404 })
      }

      const gameColumns =
        "id, home_team, away_team, home_score, away_score, game_date, game_time, field, venue, category, status, jornada, game_type, match_type, counts_for_standings, is_draft"
      const [homeRes, awayRes] = await Promise.all([
        supabase.from("games").select(gameColumns).eq("season_id", season.id).eq("home_team", team.name),
        supabase.from("games").select(gameColumns).eq("season_id", season.id).eq("away_team", team.name),
      ])
      if (homeRes.error) throw new Error(homeRes.error.message)
      if (awayRes.error) throw new Error(awayRes.error.message)
      const games = Array.from(
        new Map([...(homeRes.data || []), ...(awayRes.data || [])].map((g: any) => [g.id, g])).values(),
      )

      const rows = await getStandings({ seasonId: season.id, category: team.category })
      const row = rows.find((r) => r.team_id === team.id) || null

      const list = games
        .map((g: any) => ({
          ...g,
          game_date: g.game_date ? String(g.game_date).slice(0, 10) : "",
          is_home: g.home_team === team.name,
          rival: g.home_team === team.name ? g.away_team : g.home_team,
          counts: gameCountsForStandings(g as StandingsGame, team.category),
        }))
        .sort((a: any, b: any) => {
          const ja = a.jornada ?? 999
          const jb = b.jornada ?? 999
          if (ja !== jb) return ja - jb
          if (a.game_date !== b.game_date) return a.game_date.localeCompare(b.game_date)
          return String(a.game_time || "").localeCompare(String(b.game_time || ""))
        })

      return NextResponse.json({
        success: true,
        season,
        team,
        row,
        position_total: rows.length,
        games: list,
        season_teams: seasonTeams || [],
      })
    }

    const category = searchParams.get("category")
    const categories = Array.from(new Set((seasonTeams || []).map((t: any) => t.category).filter(Boolean))).sort()
    const selected = category && categories.includes(category) ? category : categories[0] || null
    const rows = selected ? await getStandings({ seasonId: season.id, category: selected }) : []

    return NextResponse.json({ success: true, season, categories, category: selected, rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/** Guarda el ajuste manual de un equipo: body { team_id, wins, losses, ties, points_for, points_against, points, note } */
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const teamId = Number(body.team_id)
    if (!Number.isFinite(teamId)) {
      return NextResponse.json({ success: false, message: "team_id requerido" }, { status: 400 })
    }
    const { data: team } = await supabase.from("teams").select("id, season_id").eq("id", teamId).maybeSingle()
    if (!team?.season_id) {
      return NextResponse.json({ success: false, message: "Equipo no encontrado" }, { status: 404 })
    }

    const values: Record<string, number> = {}
    for (const field of ADJUSTABLE_FIELDS) {
      const n = Math.trunc(Number(body[field]) || 0)
      values[field] = n
    }
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
    const empty = Object.values(values).every((v) => v === 0) && !note

    if (empty) {
      const { error } = await supabase
        .from("standings_adjustments")
        .delete()
        .eq("season_id", team.season_id)
        .eq("team_id", teamId)
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, data: null })
    }

    const { data, error } = await supabase
      .from("standings_adjustments")
      .upsert(
        { season_id: team.season_id, team_id: teamId, ...values, note, updated_at: new Date().toISOString() },
        { onConflict: "season_id,team_id" },
      )
      .select()
      .single()
    if (error) {
      const hint = /standings_adjustments/.test(error.message)
        ? " (corre scripts/2026-11-09-ajustes-tabla.sql en Supabase)"
        : ""
      throw new Error(error.message + hint)
    }
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/** Quita el ajuste manual: ?team_id=N */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const teamId = Number(new URL(req.url).searchParams.get("team_id"))
    if (!Number.isFinite(teamId)) {
      return NextResponse.json({ success: false, message: "team_id requerido" }, { status: 400 })
    }
    const { error } = await supabase.from("standings_adjustments").delete().eq("team_id", teamId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
