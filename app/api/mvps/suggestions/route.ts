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

const TOP = 3
const PAGE = 1000

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
  team_id: number
  team_name: string
  score: number
  detail: string
  games?: number
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

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })

    const games = await fetchAll<GameRow>((from, to) =>
      supabase
        .from("games")
        .select("id, home_team, away_team, home_score, away_score, jornada, category, game_date, status")
        .eq("season_id", season.id)
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

    const { data: mvps } = await supabase
      .from("mvps")
      .select("id, player_id, mvp_type, category, week_number, notes")
      .eq("season_id", season.id)

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
      const base = {
        player_id: Number(s.player_id),
        name: s.players.name,
        jersey_number: s.players.jersey_number ?? null,
        team_id: Number(s.team_id),
        team_name: team,
      }
      const list = byGame.get(g.id) || []
      list.push({ ...base, score, detail: mvpDetail(s) })
      byGame.set(g.id, list)

      if (g.jornada == null || !g.category) continue
      const key = `${g.jornada}|${g.category}`
      const week = byWeek.get(key) || new Map()
      const entry = week.get(base.player_id) || { base, lines: [], score: 0 }
      entry.lines.push(s)
      entry.score += score
      week.set(base.player_id, entry)
      byWeek.set(key, week)
    }

    const rank = (list: Candidate[]) =>
      list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, TOP)

    const gameMvp = new Map<number, number>()
    for (const m of mvps || []) {
      const match = m.mvp_type === "game" && /partido #(\d+)/i.exec(m.notes || "")
      if (match) gameMvp.set(Number(match[1]), Number(m.player_id))
    }

    const gameResults = Array.from(byGame.entries())
      .map(([id, list]) => ({ game: gameById.get(id)!, candidates: rank(list), assigned_player_id: gameMvp.get(id) ?? null }))
      .sort(
        (a, b) =>
          (Number(b.game.jornada) || 0) - (Number(a.game.jornada) || 0) ||
          String(a.game.category).localeCompare(String(b.game.category)) ||
          a.game.id - b.game.id,
      )

    const weekResults = Array.from(byWeek.entries())
      .map(([key, players]) => {
        const [jornada, category] = key.split("|")
        const candidates = rank(
          Array.from(players.values()).map((e) => ({
            ...e.base,
            score: e.score,
            detail: mvpDetail(sumStatLines(e.lines)),
            games: e.lines.length,
          })),
        )
        const assigned = (mvps || []).find(
          (m) => m.mvp_type === "weekly" && m.category === category && Number(m.week_number) === Number(jornada),
        )
        return { jornada: Number(jornada), category, candidates, assigned_player_id: assigned ? Number(assigned.player_id) : null }
      })
      .sort((a, b) => b.jornada - a.jornada || a.category.localeCompare(b.category))

    return NextResponse.json({ success: true, season, games: gameResults, weeks: weekResults })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
