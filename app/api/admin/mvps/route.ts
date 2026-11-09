import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { mvpDetail, mvpScore, sumStatLines, type PlayerGameStatLine } from "@/lib/mvp-suggestions"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

const TOP = 5
const PAGE = 1000
const SCRIPT_HINT = "corre scripts/2026-11-09-galeria-y-mvps.sql en Supabase"

interface Season {
  id: string
  name: string
  year: number | null
}

interface GameRow {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  jornada: number | null
  category: string | null
  game_date: string | null
  status: string | null
}

interface Candidate {
  player_id: number
  name: string
  jersey_number: number | null
  team_name: string
  score: number
  detail: string
  games?: number
}

interface MvpRow {
  id: number
  player_id: number
  mvp_type: string
  category: string
  week_number: number | null
  notes: string | null
  game_id?: number | null
  players?: { id: number; name: string; jersey_number: number | null; teams?: { name: string } | null } | null
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) return rows
  }
}

async function activeSeason() {
  const { data } = await supabase.from("seasons").select("id, name, year").eq("is_active", true).maybeSingle()
  return data as Season | null
}

const MVP_SELECT = "id, player_id, mvp_type, category, week_number, notes, players!mvps_player_id_fkey (id, name, jersey_number, teams!players_team_id_fkey (name))"

async function loadMvps(seasonId: string): Promise<MvpRow[]> {
  const withGame = await supabase.from("mvps").select(`${MVP_SELECT}, game_id`).eq("season_id", seasonId)
  if (!withGame.error) return (withGame.data || []) as unknown as MvpRow[]
  const { data, error } = await supabase.from("mvps").select(MVP_SELECT).eq("season_id", seasonId)
  if (error) throw new Error(error.message)
  return (data || []) as unknown as MvpRow[]
}

const gameIdOf = (m: MvpRow) => {
  if (m.game_id) return Number(m.game_id)
  const match = /partido #(\d+)/i.exec(m.notes || "")
  return match ? Number(match[1]) : null
}

const mvpView = (m: MvpRow | undefined) =>
  m
    ? {
        id: m.id,
        player_id: Number(m.player_id),
        name: m.players?.name || "Jugador",
        jersey_number: m.players?.jersey_number ?? null,
        team_name: m.players?.teams?.name || "",
        notes: m.notes,
      }
    : null

async function rosterFor(seasonId: string, teamFilter: { names?: string[]; category?: string }) {
  let query = supabase.from("teams").select("id, name").eq("season_id", seasonId)
  if (teamFilter.category) query = query.eq("category", teamFilter.category)
  const { data: teams, error } = await query
  if (error) throw new Error(error.message)
  const wanted = teamFilter.names?.map((n) => n.trim())
  const selected = (teams || []).filter((t) => !wanted || wanted.includes(String(t.name).trim()))
  if (selected.length === 0) return []
  const nameById = new Map(selected.map((t) => [Number(t.id), String(t.name)]))
  const players = await fetchAll<any>((from, to) =>
    supabase
      .from("players")
      .select("id, name, jersey_number, team_id")
      .in("team_id", Array.from(nameById.keys()))
      .order("name")
      .range(from, to),
  )
  return players.map((p) => ({
    id: Number(p.id),
    name: p.name,
    jersey_number: p.jersey_number ?? null,
    team_name: nameById.get(Number(p.team_id)) || "",
  }))
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })
    const { searchParams } = new URL(request.url)

    const rosterGame = searchParams.get("roster_game")
    const rosterCategory = searchParams.get("roster_category")
    if (rosterGame || rosterCategory) {
      let players
      if (rosterGame) {
        const { data: game } = await supabase.from("games").select("home_team, away_team").eq("id", Number(rosterGame)).maybeSingle()
        if (!game) return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 })
        players = await rosterFor(season.id, { names: [game.home_team, game.away_team] })
      } else {
        players = await rosterFor(season.id, { category: rosterCategory! })
      }
      return NextResponse.json({ success: true, players })
    }

    const games = await fetchAll<GameRow>((from, to) =>
      supabase
        .from("games")
        .select("id, home_team, away_team, home_score, away_score, jornada, category, game_date, status")
        .eq("season_id", season.id)
        .not("jornada", "is", null)
        .order("id")
        .range(from, to),
    )
    const gameById = new Map(games.map((g) => [g.id, g]))
    const gameIds = games.map((g) => g.id)

    const stats: any[] = []
    for (let i = 0; i < gameIds.length; i += 150) {
      const chunk = gameIds.slice(i, i + 150)
      stats.push(
        ...(await fetchAll<any>((from, to) =>
          supabase
            .from("player_game_stats")
            .select("*, players!player_game_stats_player_id_fkey (id, name, jersey_number)")
            .in("game_id", chunk)
            .order("id")
            .range(from, to),
        )),
      )
    }

    const teamIds = Array.from(new Set(stats.map((s) => Number(s.team_id)).filter(Boolean)))
    const { data: teams, error: teamsError } = teamIds.length
      ? await supabase.from("teams").select("id, name").in("id", teamIds)
      : { data: [], error: null }
    if (teamsError) throw new Error(teamsError.message)
    const teamName = new Map((teams || []).map((t: any) => [Number(t.id), String(t.name)]))

    const mvps = await loadMvps(season.id)

    const won = (g: GameRow, team: string) => {
      if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) return false
      const winner = g.home_score > g.away_score ? g.home_team : g.away_team
      return winner.trim() === team.trim()
    }

    const byGame = new Map<number, Candidate[]>()
    const byWeek = new Map<string, Map<number, { base: Omit<Candidate, "score" | "detail">; lines: PlayerGameStatLine[]; score: number }>>()

    for (const s of stats) {
      const g = gameById.get(Number(s.game_id))
      if (!g || !s.players) continue
      const team = teamName.get(Number(s.team_id)) || ""
      const score = mvpScore(s, won(g, team))
      if (score <= 0) continue
      const base = { player_id: Number(s.player_id), name: s.players.name, jersey_number: s.players.jersey_number ?? null, team_name: team }
      const list = byGame.get(g.id) || []
      list.push({ ...base, score, detail: mvpDetail(s) })
      byGame.set(g.id, list)

      if (!g.category) continue
      const key = `${g.jornada}|${g.category}`
      const week = byWeek.get(key) || new Map()
      const entry = week.get(base.player_id) || { base, lines: [], score: 0 }
      entry.lines.push(s)
      entry.score += score
      week.set(base.player_id, entry)
      byWeek.set(key, week)
    }

    const rank = (list: Candidate[]) => list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, TOP)

    const gameMvps = new Map<number, MvpRow>()
    for (const m of mvps) {
      const gid = m.mvp_type === "game" ? gameIdOf(m) : null
      if (gid) gameMvps.set(gid, m)
    }

    const gameSlots = games
      .map((g) => ({ game: g, candidates: rank(byGame.get(g.id) || []), mvp: mvpView(gameMvps.get(g.id)) }))
      .sort((a, b) => String(a.game.category).localeCompare(String(b.game.category)) || a.game.id - b.game.id)

    const weekKeys = new Set(games.filter((g) => g.category).map((g) => `${g.jornada}|${g.category}`))
    const weekSlots = Array.from(weekKeys)
      .map((key) => {
        const [jornada, category] = key.split("|")
        const players = byWeek.get(key)
        const candidates = rank(
          Array.from(players?.values() || []).map((e) => ({
            ...e.base,
            score: e.score,
            detail: mvpDetail(sumStatLines(e.lines)),
            games: e.lines.length,
          })),
        )
        const mvp = mvps.find((m) => m.mvp_type === "weekly" && m.category === category && Number(m.week_number) === Number(jornada))
        return { jornada: Number(jornada), category, candidates, mvp: mvpView(mvp) }
      })
      .sort((a, b) => a.category.localeCompare(b.category))

    const today = new Date().toISOString().slice(0, 10)
    const played = games.filter((g) => (g.game_date || "").slice(0, 10) <= today).map((g) => Number(g.jornada))
    const jornadas = Array.from(new Set(games.map((g) => Number(g.jornada)))).sort((a, b) => b - a)

    return NextResponse.json({
      success: true,
      season,
      jornadas,
      current_jornada: played.length ? Math.max(...played) : jornadas[jornadas.length - 1] ?? null,
      weeks: weekSlots,
      games: gameSlots,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

/** Asigna o cambia el MVP de un partido o el jugador de la semana. */
export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })
    const body = await request.json()
    const playerId = Number(body.player_id)
    if (!playerId) return NextResponse.json({ success: false, message: "Elige un jugador" }, { status: 400 })
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null

    const mvps = await loadMvps(season.id)
    let row: Record<string, unknown>
    let existing: MvpRow | undefined

    if (body.kind === "game") {
      const gameId = Number(body.game_id)
      const { data: game } = await supabase
        .from("games")
        .select("id, category, jornada, home_team, away_team")
        .eq("id", gameId)
        .maybeSingle()
      if (!game) return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 })
      existing = mvps.find((m) => m.mvp_type === "game" && gameIdOf(m) === gameId)
      row = {
        mvp_type: "game",
        category: game.category,
        week_number: game.jornada,
        game_id: gameId,
        notes: notes || `J${game.jornada} · ${game.home_team} vs ${game.away_team} · partido #${gameId}`,
      }
    } else if (body.kind === "weekly") {
      const jornada = Number(body.jornada)
      const category = String(body.category || "")
      if (!jornada || !category) return NextResponse.json({ success: false, message: "Falta jornada o categoría" }, { status: 400 })
      existing = mvps.find((m) => m.mvp_type === "weekly" && m.category === category && Number(m.week_number) === jornada)
      row = { mvp_type: "weekly", category, week_number: jornada, notes: notes || `Jugador de la semana J${jornada}` }
    } else {
      return NextResponse.json({ success: false, message: "Tipo de MVP inválido" }, { status: 400 })
    }

    row = { ...row, player_id: playerId, season_id: season.id, ...(season.year ? { season: String(season.year) } : {}) }

    const write = (values: Record<string, unknown>) =>
      existing
        ? supabase.from("mvps").update(values).eq("id", existing.id)
        : supabase.from("mvps").insert(values)

    let { error } = await write(row)
    if (error && /game_id/.test(error.message)) {
      const { game_id: _omit, ...withoutGame } = row
      ;({ error } = await write(withoutGame))
    }
    if (error) {
      return NextResponse.json({ success: false, message: `${error.message} (${SCRIPT_HINT})` }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: existing ? "MVP actualizado" : "MVP asignado" })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  const id = Number(new URL(request.url).searchParams.get("id"))
  if (!id) return NextResponse.json({ success: false, message: "ID requerido" }, { status: 400 })
  const { error } = await supabase.from("mvps").delete().eq("id", id)
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: "MVP quitado" })
}
