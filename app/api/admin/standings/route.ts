import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import {
  ADJUSTABLE_FIELDS,
  gameCountsForStandings,
  getStandingsAllCategories,
  recordFromGames,
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

const GAME_COLUMNS =
  "id, home_team, away_team, home_score, away_score, game_date, game_time, field, venue, category, status, jornada, game_type, match_type, counts_for_standings, is_draft"

function tableHint(message: string) {
  return /standings_adjustments/.test(message) ? `${message} (corre scripts/2026-11-09-team-stats-auto.sql en Supabase)` : message
}

/** Suma valores a los ajustes existentes (o los reemplaza si replace=true) y guarda/borra la fila. */
async function writeAdjustment(
  seasonId: string,
  teamId: number,
  values: Record<string, number>,
  note: string | null,
  mode: "replace" | "add",
) {
  let finalValues = values
  let finalNote = note
  if (mode === "add") {
    const { data: current } = await supabase
      .from("standings_adjustments")
      .select("*")
      .eq("season_id", seasonId)
      .eq("team_id", teamId)
      .maybeSingle()
    finalValues = Object.fromEntries(
      ADJUSTABLE_FIELDS.map((f) => [f, (Number(current?.[f]) || 0) + (Number(values[f]) || 0)]),
    )
    finalNote = [current?.note, note].filter(Boolean).join(" · ") || null
  }

  const empty = ADJUSTABLE_FIELDS.every((f) => !finalValues[f]) && !finalNote
  if (empty) {
    const { error } = await supabase.from("standings_adjustments").delete().eq("season_id", seasonId).eq("team_id", teamId)
    if (error) throw new Error(tableHint(error.message))
    return
  }
  const { error } = await supabase
    .from("standings_adjustments")
    .upsert(
      { season_id: seasonId, team_id: teamId, ...finalValues, note: finalNote, updated_at: new Date().toISOString() },
      { onConflict: "season_id,team_id" },
    )
  if (error) throw new Error(tableHint(error.message))
}

/**
 * GET ?category=slug → tabla de la categoría (igual a la pública), números de todos los equipos
 *                      y los partidos de la categoría.
 * GET ?team_id=N     → datos completos del equipo.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa" }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("team_id")
    if (teamId) {
      const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", Number(teamId))
        .eq("season_id", season.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!team) return NextResponse.json({ success: false, message: "Equipo no encontrado" }, { status: 404 })
      return NextResponse.json({ success: true, team })
    }

    const [{ data: seasonTeams, error: teamsError }, { data: games, error: gamesError }, allRows] = await Promise.all([
      supabase.from("teams").select("id, name, category, status").eq("season_id", season.id).order("name"),
      supabase.from("games").select(GAME_COLUMNS).eq("season_id", season.id),
      getStandingsAllCategories(season.id),
    ])
    if (teamsError) throw new Error(teamsError.message)
    if (gamesError) throw new Error(gamesError.message)

    const categories = Array.from(new Set((seasonTeams || []).map((t: any) => t.category).filter(Boolean))).sort()
    const requested = searchParams.get("category")
    const category = requested && categories.includes(requested) ? requested : categories[0] || null

    const rows = allRows.filter((r) => r.team_category === category).sort((a, b) => a.position - b.position)
    const categoryNames = new Set((seasonTeams || []).filter((t: any) => t.category === category).map((t: any) => t.name))
    const categoryGames = (games || [])
      .filter((g: any) => g.category === category || categoryNames.has(g.home_team) || categoryNames.has(g.away_team))
      .map((g: any) => ({
        ...g,
        game_date: g.game_date ? String(g.game_date).slice(0, 10) : "",
        counts: gameCountsForStandings(g as StandingsGame, g.category),
      }))
      .sort((a: any, b: any) => {
        const ja = a.jornada ?? -1
        const jb = b.jornada ?? -1
        if (ja !== jb) return jb - ja
        if (a.game_date !== b.game_date) return b.game_date.localeCompare(a.game_date)
        return String(a.game_time || "").localeCompare(String(b.game_time || ""))
      })

    return NextResponse.json({
      success: true,
      season,
      categories,
      category,
      rows,
      team_rows: allRows,
      games: categoryGames,
      season_teams: seasonTeams || [],
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/**
 * Guarda ajustes manuales.
 * body { items: [{ team_id, wins, losses, ties, points_for, points_against, points, note }], mode?: "replace" | "add" }
 * (también acepta un solo ajuste sin "items").
 */
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const items: any[] = Array.isArray(body.items) ? body.items : [body]
    const mode = body.mode === "add" ? "add" : "replace"

    for (const item of items) {
      const teamId = Number(item.team_id)
      if (!Number.isFinite(teamId)) {
        return NextResponse.json({ success: false, message: "team_id requerido" }, { status: 400 })
      }
      const { data: team } = await supabase.from("teams").select("id, season_id").eq("id", teamId).maybeSingle()
      if (!team?.season_id) {
        return NextResponse.json({ success: false, message: `Equipo ${teamId} no encontrado` }, { status: 404 })
      }
      const values = Object.fromEntries(ADJUSTABLE_FIELDS.map((f) => [f, Math.trunc(Number(item[f]) || 0)]))
      const note = typeof item.note === "string" && item.note.trim() ? item.note.trim() : null
      await writeAdjustment(team.season_id, teamId, values, note, mode)
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/**
 * Borra un partido. body { game_id, keep_result }
 * keep_result=true: antes de borrarlo, pasa su resultado a los ajustes de los dos equipos
 * para que la tabla quede igual aunque el partido ya no exista.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const gameId = Number(body.game_id)
    if (!Number.isFinite(gameId)) {
      return NextResponse.json({ success: false, message: "game_id requerido" }, { status: 400 })
    }
    const { data, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle()
    if (gameError) throw new Error(gameError.message)
    const game = data as (StandingsGame & { season_id: string; jornada: number | null }) | null
    if (!game) return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 })

    const kept: string[] = []
    if (body.keep_result) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, category, status")
        .eq("season_id", game.season_id)
        .in("name", [game.home_team, game.away_team])
      for (const team of teams || []) {
        if (team.status !== "active" || !gameCountsForStandings(game, team.category)) continue
        const r = recordFromGames(team.name, [game])
        const label = `J${game.jornada ?? "?"} ${game.home_team} ${game.home_score ?? 0}-${game.away_score ?? 0} ${game.away_team} (partido borrado)`
        await writeAdjustment(
          game.season_id,
          team.id,
          {
            wins: r.games_won,
            losses: r.games_lost,
            ties: r.games_tied,
            points_for: r.points_for,
            points_against: r.points_against,
            points: 0,
          },
          label,
          "add",
        )
        kept.push(team.name)
      }
    }

    const { error } = await supabase.from("games").delete().eq("id", gameId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, kept_for: kept })
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
