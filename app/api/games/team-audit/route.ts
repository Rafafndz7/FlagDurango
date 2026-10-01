import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

type GameRow = {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  game_date: string | null
  game_time: string | null
  field: string | null
  venue: string | null
  category: string | null
  status: string | null
  jornada: number | null
  game_type: string | null
  match_type: string | null
  counts_for_standings: boolean | null
  is_draft: boolean | null
  created_at: string | null
}

type TeamRow = { id: number; name: string; category: string | null }

export type AuditFlag =
  | "duplicado_exacto"
  | "rival_repetido"
  | "otra_categoria"
  | "no_cuenta"
  | "rival_inexistente"
  | "doble_jornada"
  | "borrador"

const STATUS_RANK: Record<string, number> = { finalizado: 3, en_vivo: 2, "en vivo": 2, programado: 1 }

function day(d: string | null) {
  return d ? String(d).slice(0, 10) : ""
}

function pairKey(g: GameRow) {
  return [g.home_team, g.away_team].sort().join("|||") + "@@" + (g.category || "")
}

function countsInTable(g: GameRow, teamCategory: string | null) {
  return (
    g.status === "finalizado" &&
    g.counts_for_standings !== false &&
    (g.game_type || "regular") === "regular" &&
    g.match_type !== "amistoso" &&
    g.is_draft !== true &&
    g.category === teamCategory
  )
}

/** El que se conserva en un grupo de duplicados: finalizado con marcador > en vivo > programado, luego el más antiguo */
function pickKeeper(group: GameRow[]) {
  return [...group].sort((a, b) => {
    const ra = STATUS_RANK[a.status || ""] || 0
    const rb = STATUS_RANK[b.status || ""] || 0
    if (ra !== rb) return rb - ra
    const sa = a.home_score != null || a.away_score != null ? 1 : 0
    const sb = b.home_score != null || b.away_score != null ? 1 : 0
    if (sa !== sb) return sb - sa
    return a.id - b.id
  })[0]
}

function auditTeam(team: TeamRow, games: GameRow[], teamNames: Set<string>) {
  const mine = games.filter((g) => g.home_team === team.name || g.away_team === team.name)

  const byExact = new Map<string, GameRow[]>()
  const byPair = new Map<string, GameRow[]>()
  const byJornada = new Map<number, GameRow[]>()
  for (const g of mine) {
    const pk = pairKey(g)
    const ek = pk + "##" + day(g.game_date)
    byExact.set(ek, [...(byExact.get(ek) || []), g])
    byPair.set(pk, [...(byPair.get(pk) || []), g])
    if (g.jornada != null && g.is_draft !== true) {
      byJornada.set(g.jornada, [...(byJornada.get(g.jornada) || []), g])
    }
  }

  const extraIds = new Set<number>()
  const flagsById = new Map<number, AuditFlag[]>()
  const addFlag = (id: number, f: AuditFlag) => flagsById.set(id, [...(flagsById.get(id) || []), f])

  for (const group of Array.from(byExact.values())) {
    if (group.length < 2) continue
    const keeper = pickKeeper(group)
    for (const g of group) {
      addFlag(g.id, "duplicado_exacto")
      if (g.id !== keeper.id) extraIds.add(g.id)
    }
  }
  for (const group of Array.from(byPair.values())) {
    const distinctDays = new Set(group.map((g) => day(g.game_date)))
    if (distinctDays.size < 2) continue
    for (const g of group) {
      if (!flagsById.get(g.id)?.includes("duplicado_exacto")) addFlag(g.id, "rival_repetido")
    }
  }
  for (const group of Array.from(byJornada.values())) {
    if (group.length < 2) continue
    for (const g of group) addFlag(g.id, "doble_jornada")
  }

  const rows = mine.map((g) => {
    const isHome = g.home_team === team.name
    const rival = isHome ? g.away_team : g.home_team
    if (g.category !== team.category) addFlag(g.id, "otra_categoria")
    if (g.status === "finalizado" && !countsInTable(g, team.category) && g.category === team.category) {
      addFlag(g.id, "no_cuenta")
    }
    if (!teamNames.has(rival)) addFlag(g.id, "rival_inexistente")
    if (g.is_draft === true) addFlag(g.id, "borrador")
    return {
      ...g,
      game_date: day(g.game_date),
      rival,
      is_home: isHome,
      counts_in_table: countsInTable(g, team.category),
      suggested_delete: extraIds.has(g.id),
      flags: flagsById.get(g.id) || [],
    }
  })

  rows.sort((a, b) => {
    const ja = a.jornada ?? 999
    const jb = b.jornada ?? 999
    if (ja !== jb) return ja - jb
    if (a.game_date !== b.game_date) return a.game_date.localeCompare(b.game_date)
    return String(a.game_time || "").localeCompare(String(b.game_time || ""))
  })

  let w = 0, l = 0, t = 0, pf = 0, pa = 0
  for (const r of rows) {
    if (!r.counts_in_table) continue
    const mineScore = (r.is_home ? r.home_score : r.away_score) || 0
    const theirScore = (r.is_home ? r.away_score : r.home_score) || 0
    pf += mineScore
    pa += theirScore
    if (mineScore > theirScore) w++
    else if (mineScore < theirScore) l++
    else t++
  }

  return {
    games: rows,
    record: { played: w + l + t, wins: w, losses: l, ties: t, points: w * 3 + t, points_for: pf, points_against: pa },
    extra_count: extraIds.size,
    issue_count: rows.filter((r) => r.flags.some((f) => f !== "borrador")).length,
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("team_id")

    const { data: season } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle()
    if (!season?.id) {
      return NextResponse.json({ success: false, message: "No hay temporada activa" }, { status: 400 })
    }

    const [{ data: teams, error: teamsErr }, { data: games, error: gamesErr }] = await Promise.all([
      supabase.from("teams").select("id, name, category").eq("season_id", season.id).order("category").order("name"),
      supabase
        .from("games")
        .select(
          "id, home_team, away_team, home_score, away_score, game_date, game_time, field, venue, category, status, jornada, game_type, match_type, counts_for_standings, is_draft, created_at",
        )
        .eq("season_id", season.id),
    ])
    if (teamsErr) throw new Error(teamsErr.message)
    if (gamesErr) throw new Error(gamesErr.message)

    const teamList = (teams || []) as TeamRow[]
    const gameList = (games || []) as GameRow[]
    const names = new Set(teamList.map((t) => t.name))

    if (teamId) {
      const team = teamList.find((t) => String(t.id) === teamId)
      if (!team) {
        return NextResponse.json({ success: false, message: "Equipo no encontrado en la temporada activa" }, { status: 404 })
      }
      return NextResponse.json({ success: true, season, team, ...auditTeam(team, gameList, names) })
    }

    const summary = teamList.map((team) => {
      const a = auditTeam(team, gameList, names)
      return {
        id: team.id,
        name: team.name,
        category: team.category,
        total_games: a.games.length,
        counted_games: a.record.played,
        extra_count: a.extra_count,
        issue_count: a.issue_count,
      }
    })

    return NextResponse.json({ success: true, season, teams: summary })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/** Borra varios partidos a la vez: body { ids: number[] } */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter((n: number) => Number.isFinite(n)) : []
    if (!ids.length) {
      return NextResponse.json({ success: false, message: "No hay partidos seleccionados" }, { status: 400 })
    }
    const { error, count } = await supabase.from("games").delete({ count: "exact" }).in("id", ids)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, deleted: count ?? ids.length, message: `Borrados ${count ?? ids.length} partidos` })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
