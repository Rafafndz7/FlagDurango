"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ListChecks,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Save,
  Search,
  UserPlus,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCategoryLabel as baseCategoryLabel } from "@/lib/categories"
import { formatGameTime, gameDateParts } from "@/lib/game-date"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"
import { EASE_OUT } from "@/components/ui-v2/motion"

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time?: string
  field?: string
  venue?: string
  jornada?: number | string | null
  home_score?: number
  away_score?: number
  status: string
  category?: string
  season_id?: string
}

interface Team {
  id: number
  name: string
  category?: string
  season_id?: string
  logo_url?: string | null
  color1?: string | null
  color2?: string | null
}

interface Player {
  id: number
  name: string
  jersey_number: number
  position?: string
  team_id: number
}

/** Resuelve el equipo del partido por nombre + temporada (evita roster de temporada anterior). */
function findTeamForGame(
  teams: Team[],
  teamName: string,
  game?: Game | null,
): Team | undefined {
  if (!teamName) return undefined
  const name = teamName.trim()
  const seasonId = game?.season_id
  const category = game?.category

  const sameName = (t: Team) => (t.name || "").trim() === name

  if (seasonId) {
    const bySeasonCat = teams.find(
      (t) =>
        sameName(t) &&
        t.season_id === seasonId &&
        (!category || t.category === category),
    )
    if (bySeasonCat) return bySeasonCat

    const bySeason = teams.find((t) => sameName(t) && t.season_id === seasonId)
    if (bySeason) return bySeason
  }

  if (category) {
    const byCat = teams.find((t) => sameName(t) && t.category === category)
    if (byCat) return byCat
  }

  // Último recurso: preferir el de mayor id (más reciente)
  const matches = teams.filter(sameName)
  if (matches.length === 0) return undefined
  return matches.reduce((a, b) => (Number(a.id) >= Number(b.id) ? a : b))
}

interface PlayerStat {
  player_id: number
  game_id: number
  team_id: number
  pases_completos: number
  pases_intentados: number
  yardas_pase: number
  touchdowns_pase: number
  intercepciones_lanzadas: number
  carreras: number
  yardas_carrera: number
  touchdowns_carrera: number
  recepciones: number
  yardas_recepcion: number
  touchdowns_recepcion: number
  puntos_extra: number
  sacks: number
  intercepciones: number
  yardas_intercepcion: number
  touchdowns_intercepcion: number
  pases_defendidos: number
  banderas_jaladas: number
  touchdowns_totales: number
  puntos_totales: number
}

const EMPTY_STAT: Omit<PlayerStat, "player_id" | "game_id" | "team_id"> = {
  pases_completos: 0,
  pases_intentados: 0,
  yardas_pase: 0,
  touchdowns_pase: 0,
  intercepciones_lanzadas: 0,
  carreras: 0,
  yardas_carrera: 0,
  touchdowns_carrera: 0,
  recepciones: 0,
  yardas_recepcion: 0,
  touchdowns_recepcion: 0,
  puntos_extra: 0,
  sacks: 0,
  intercepciones: 0,
  yardas_intercepcion: 0,
  touchdowns_intercepcion: 0,
  pases_defendidos: 0,
  banderas_jaladas: 0,
  touchdowns_totales: 0,
  puntos_totales: 0,
}

type StatKey = keyof typeof EMPTY_STAT

const QUICK_FIELDS: { key: StatKey; label: string; short: string; active: string; dot: string }[] = [
  { key: "pases_completos", label: "Pases completos", short: "PC", active: "bg-brand-blue/10 ring-brand-blue/40 text-brand-blue", dot: "bg-brand-blue" },
  { key: "touchdowns_recepcion", label: "TD recepción", short: "TD", active: "bg-emerald-500/10 ring-emerald-500/40 text-emerald-700", dot: "bg-emerald-500" },
  { key: "intercepciones", label: "Intercepciones", short: "INT", active: "bg-brand-pink/10 ring-brand-pink/50 text-[#b03c8f]", dot: "bg-brand-pink" },
  { key: "sacks", label: "Sacks", short: "SACK", active: "bg-brand-orange/10 ring-brand-orange/40 text-[#c24f00]", dot: "bg-brand-orange" },
]

const STEPPERS_WIDTH = "sm:w-[344px]"

const getCategoryLabel = (category?: string | null) => {
  if (!category) return "Sin categoría"
  const label = baseCategoryLabel(category)
  return label === category
    ? category
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : label
}

const hasQuickData = (stat?: Partial<typeof EMPTY_STAT>) =>
  !!stat && QUICK_FIELDS.some((f) => Number(stat[f.key]) > 0)

interface PlayerStatsAdminProps {
  games: Game[]
  teams: Team[]
  players: Player[]
  onPlayersChange?: () => void
}

export default function PlayerStatsAdmin({ games, teams, players, onPlayersChange }: PlayerStatsAdminProps) {
  const [selectedGame, setSelectedGame] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [coverageFilter, setCoverageFilter] = useState<"missing" | "done" | "all">("missing")
  const [gameSearch, setGameSearch] = useState("")
  const [gameLimit, setGameLimit] = useState(24)
  const [statsCounts, setStatsCounts] = useState<Record<number, number>>({})
  const [statsMap, setStatsMap] = useState<Record<number, typeof EMPTY_STAT>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeSide, setActiveSide] = useState<"home" | "away">("home")
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [addForm, setAddForm] = useState({
    team_id: "",
    name: "",
    jersey_number: "",
    position: "",
  })
  const [addingPlayer, setAddingPlayer] = useState(false)

  const categories = Array.from(new Set(games.map((g) => g.category).filter(Boolean))) as string[]

  const loadCoverage = useCallback(async () => {
    try {
      const res = await fetch("/api/player-stats?coverage=1", { cache: "no-store" })
      const data = await res.json()
      if (data.success) setStatsCounts(data.counts || {})
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadCoverage()
  }, [loadCoverage])

  const filteredGames = useMemo(() => {
    const q = gameSearch.trim().toLowerCase()
    return games
      .filter((g) => {
        if (selectedCategory && g.category !== selectedCategory) return false
        if (q && !`${g.home_team} ${g.away_team}`.toLowerCase().includes(q)) return false
        const count = statsCounts[g.id] || 0
        if (coverageFilter === "missing") return count === 0
        if (coverageFilter === "done") return count > 0
        return true
      })
      .sort((a, b) => {
        const da = (a.game_date || "").slice(0, 10)
        const db = (b.game_date || "").slice(0, 10)
        return db.localeCompare(da) || String(a.game_time || "").localeCompare(String(b.game_time || ""))
      })
  }, [games, selectedCategory, coverageFilter, statsCounts, gameSearch])

  useEffect(() => {
    setGameLimit(24)
  }, [selectedCategory, coverageFilter, gameSearch])

  const missingCount = useMemo(
    () => games.filter((g) => !(statsCounts[g.id] > 0)).length,
    [games, statsCounts],
  )
  const doneCount = useMemo(
    () => games.filter((g) => statsCounts[g.id] > 0).length,
    [games, statsCounts],
  )

  const selectedGameData = games.find((g) => g.id === selectedGame)

  const getGamePlayers = () => {
    if (!selectedGameData) return { home: [] as Player[], away: [] as Player[], homeTeam: undefined, awayTeam: undefined }
    const homeTeam = findTeamForGame(teams, selectedGameData.home_team, selectedGameData)
    const awayTeam = findTeamForGame(teams, selectedGameData.away_team, selectedGameData)
    const byJersey = (a: Player, b: Player) => (Number(a.jersey_number) || 999) - (Number(b.jersey_number) || 999)
    return {
      home: players.filter((p) => homeTeam && Number(p.team_id) === Number(homeTeam.id)).sort(byJersey),
      away: players.filter((p) => awayTeam && Number(p.team_id) === Number(awayTeam.id)).sort(byJersey),
      homeTeam,
      awayTeam,
    }
  }

  const loadStats = async (gameId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/player-stats?game_id=${gameId}`)
      const data = await res.json()
      if (data.success) {
        const map: Record<number, typeof EMPTY_STAT> = {}
        for (const stat of data.data || []) {
          map[stat.player_id] = { ...EMPTY_STAT, ...stat }
        }
        setStatsMap(map)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    setMessage(null)
    setActiveSide("home")
    if (selectedGame) loadStats(selectedGame)
    else setStatsMap({})
  }, [selectedGame])

  useEffect(() => {
    if (!selectedGameData) return
    const homeTeam = findTeamForGame(teams, selectedGameData.home_team, selectedGameData)
    if (homeTeam) {
      setAddForm((f) => ({ ...f, team_id: String(homeTeam.id) }))
    }
  }, [selectedGameData, teams])

  useEffect(() => {
    if (message?.type !== "success") return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  const updateStat = (playerId: number, field: StatKey, value: number | ((current: number) => number)) => {
    setStatsMap((prev) => {
      const current = prev[playerId] || { ...EMPTY_STAT }
      const next = typeof value === "function" ? value(Number(current[field]) || 0) : value
      return {
        ...prev,
        [playerId]: {
          ...current,
          [field]: Math.max(0, next),
        },
      }
    })
  }

  const handleSave = async () => {
    if (!selectedGame || !selectedGameData) return
    setSaving(true)
    setMessage(null)

    const { home, away } = getGamePlayers()
    const allPlayers = [...home, ...away]

    const stats = allPlayers
      .filter((p) => statsMap[p.id])
      .map((p) => ({
        player_id: p.id,
        game_id: selectedGame,
        team_id: p.team_id,
        ...statsMap[p.id],
      }))

    if (stats.length === 0) {
      setMessage({ type: "error", text: "Captura al menos un dato antes de guardar" })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/player-stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, stats }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: `Estadísticas guardadas para ${data.data.length} jugadores` })
        await loadCoverage()
      } else {
        setMessage({ type: "error", text: data.message || "Error al guardar" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al guardar estadísticas" })
    }
    setSaving(false)
  }

  const addMissingPlayer = async () => {
    if (!addForm.team_id || !addForm.name.trim()) {
      alert("Equipo y nombre requeridos")
      return
    }
    setAddingPlayer(true)
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: Number(addForm.team_id),
          name: addForm.name.trim(),
          jersey_number: addForm.jersey_number ? Number(addForm.jersey_number) : null,
          position: addForm.position || null,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo crear")
        return
      }
      setAddForm((f) => ({ ...f, name: "", jersey_number: "", position: "" }))
      setMessage({ type: "success", text: `Jugador ${data.data.name} agregado al roster` })
      onPlayersChange?.()
    } finally {
      setAddingPlayer(false)
    }
  }

  const { home, away, homeTeam, awayTeam } = getGamePlayers()
  const gamePlayers = [...home, ...away]
  const playersWithData = gamePlayers.filter((p) => hasQuickData(statsMap[p.id])).length
  const gameTotals = QUICK_FIELDS.map((f) => ({
    ...f,
    total: gamePlayers.reduce((sum, p) => sum + (Number(statsMap[p.id]?.[f.key]) || 0), 0),
  }))

  const renderPlayerRow = (player: Player) => {
    const stat = statsMap[player.id]
    const filled = hasQuickData(stat)
    return (
      <div
        key={player.id}
        className={cn(
          "rounded-2xl p-2.5 ring-1 transition-colors sm:flex sm:items-center sm:gap-3",
          filled ? "bg-white ring-slate-300 shadow-sm" : "bg-slate-50/70 ring-slate-200/70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold italic",
              filled ? "bg-brand-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {player.jersey_number ?? "–"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{player.name}</p>
            {player.position && <p className="truncate text-[11px] text-slate-500">{player.position}</p>}
          </div>
        </div>
        <div className={cn("mt-2 grid grid-cols-4 gap-1.5 sm:mt-0 sm:shrink-0", STEPPERS_WIDTH)}>
          {QUICK_FIELDS.map((f) => (
            <Stepper
              key={f.key}
              label={f.short}
              title={f.label}
              value={Number(stat?.[f.key]) || 0}
              activeClass={f.active}
              onChange={(v) => updateStat(player.id, f.key, v)}
              onStep={(delta) => updateStat(player.id, f.key, (n) => n + delta)}
            />
          ))}
        </div>
      </div>
    )
  }

  const renderTeamPanel = (side: "home" | "away") => {
    const list = side === "home" ? home : away
    const team = side === "home" ? homeTeam : awayTeam
    const name = side === "home" ? selectedGameData?.home_team : selectedGameData?.away_team
    const totals = QUICK_FIELDS.map((f) => ({
      ...f,
      total: list.reduce((sum, p) => sum + (Number(statsMap[p.id]?.[f.key]) || 0), 0),
    }))

    return (
      <section
        className={cn(
          "rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60",
          activeSide === side ? "block" : "hidden xl:block",
        )}
      >
        <div className="mb-3 flex items-center gap-3">
          <TeamAvatar name={name || ""} logoUrl={team?.logo_url} color1={team?.color1} color2={team?.color2} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">
              {side === "home" ? "Local" : "Visitante"} · {list.length} jugadores
            </p>
          </div>
        </div>

        {list.length > 0 && (
          <div className="mb-2 hidden items-center gap-3 px-2.5 sm:flex">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jugador</span>
            <div className={cn("grid shrink-0 grid-cols-4 gap-1.5", STEPPERS_WIDTH)}>
              {totals.map((f) => (
                <span key={f.key} className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase text-slate-500" title={f.label}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />
                  {f.short}
                  <span className="text-slate-900">{f.total}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {list.length > 0 ? (
          <div className="space-y-1.5">{list.map(renderPlayerRow)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Sin jugadores en el roster.
            <button
              type="button"
              onClick={() => {
                if (team) setAddForm((f) => ({ ...f, team_id: String(team.id) }))
                setShowAddPlayer(true)
              }}
              className="mt-2 block w-full font-semibold text-brand-blue hover:underline"
            >
              Agregar jugador
            </button>
          </div>
        )}
      </section>
    )
  }

  const coverageOptions = [
    { value: "missing" as const, label: "Pendientes", count: missingCount, icon: <AlertCircle className="h-4 w-4" />, tone: "text-amber-600" },
    { value: "done" as const, label: "Capturados", count: doneCount, icon: <CheckCircle2 className="h-4 w-4" />, tone: "text-emerald-600" },
    { value: "all" as const, label: "Todos", count: games.length, icon: <ListChecks className="h-4 w-4" />, tone: "text-slate-600" },
  ]

  return (
    <div className="ui-v2 space-y-4">
      {!selectedGameData ? (
        <div className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
          <div className="mb-4">
            <h3 className="font-display text-xl font-extrabold italic text-slate-900">Estadísticas por partido</h3>
            <p className="text-sm text-slate-500">Elige un partido y captura pases completos, TD de recepción, intercepciones y sacks.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {coverageOptions.map((opt) => {
              const active = coverageFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCoverageFilter(opt.value)}
                  className={cn(
                    "rounded-2xl p-3 text-left ring-1 transition sm:p-4",
                    active ? "bg-brand-ink text-white ring-brand-ink" : "bg-white ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className={cn("flex items-center gap-1.5 text-xs font-semibold", active ? "text-white/80" : opt.tone)}>
                    {opt.icon}
                    {opt.label}
                  </span>
                  <span className={cn("mt-1 block font-display text-2xl font-extrabold italic sm:text-3xl", active ? "text-white" : "text-slate-900")}>
                    {opt.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                placeholder="Buscar equipo…"
                className="h-10 w-full rounded-full bg-slate-100 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {filteredGames.length} partidos
          </p>

          {filteredGames.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {filteredGames.slice(0, gameLimit).map((g) => (
                  <GamePickCard
                    key={g.id}
                    game={g}
                    count={statsCounts[g.id] || 0}
                    homeTeam={findTeamForGame(teams, g.home_team, g)}
                    awayTeam={findTeamForGame(teams, g.away_team, g)}
                    onSelect={() => setSelectedGame(g.id)}
                  />
                ))}
              </div>
              {filteredGames.length > gameLimit && (
                <button
                  type="button"
                  onClick={() => setGameLimit((n) => n + 24)}
                  className="mx-auto mt-3 flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <ChevronDown className="h-4 w-4" />
                  Ver más ({filteredGames.length - gameLimit})
                </button>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              {coverageFilter === "missing"
                ? "No hay partidos pendientes de estadísticas con estos filtros."
                : "No hay partidos con estos filtros."}
            </div>
          )}
        </div>
      ) : (
        <>
          <SelectedGameHeader
            game={selectedGameData}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            count={statsCounts[selectedGameData.id] || 0}
            onChange={() => setSelectedGame(null)}
          />

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl bg-white py-16 text-sm text-slate-500 ring-1 ring-slate-200/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando estadísticas…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 rounded-full bg-white p-1 ring-1 ring-slate-200 xl:hidden">
                  {(["home", "away"] as const).map((side) => {
                    const active = activeSide === side
                    const list = side === "home" ? home : away
                    const filledCount = list.filter((p) => hasQuickData(statsMap[p.id])).length
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setActiveSide(side)}
                        className={cn(
                          "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                          active ? "text-white" : "text-slate-600",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="stats-side-pill"
                            className="absolute inset-0 rounded-full bg-brand-ink"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative truncate">
                          {side === "home" ? selectedGameData.home_team : selectedGameData.away_team}
                        </span>
                        {filledCount > 0 && (
                          <span className={cn("relative rounded-full px-1.5 text-[10px] font-bold", active ? "bg-white/20" : "bg-slate-100")}>
                            {filledCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sideTeam = activeSide === "home" ? homeTeam : awayTeam
                    if (!showAddPlayer && sideTeam) setAddForm((f) => ({ ...f, team_id: String(sideTeam.id) }))
                    setShowAddPlayer((v) => !v)
                  }}
                  aria-label="Agregar jugador faltante"
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition sm:px-4 xl:ml-auto",
                    showAddPlayer ? "bg-brand-blue text-white ring-brand-blue" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">¿Falta un jugador?</span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showAddPlayer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-3xl border border-dashed border-brand-blue/40 bg-brand-blue/[0.04] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">Regístralo aquí y sigue capturando</p>
                        <button
                          type="button"
                          onClick={() => setShowAddPlayer(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white"
                          aria-label="Cerrar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1.2fr)_88px_minmax(0,1.6fr)_auto]">
                        <select
                          className={cn(inputClass, "col-span-2 sm:col-span-1")}
                          value={addForm.team_id}
                          onChange={(e) => setAddForm((f) => ({ ...f, team_id: e.target.value }))}
                        >
                          <option value="">Equipo…</option>
                          {homeTeam && <option value={String(homeTeam.id)}>Local: {homeTeam.name}</option>}
                          {awayTeam && <option value={String(awayTeam.id)}>Visita: {awayTeam.name}</option>}
                        </select>
                        <input
                          className={inputClass}
                          value={addForm.jersey_number}
                          onChange={(e) => setAddForm((f) => ({ ...f, jersey_number: e.target.value }))}
                          placeholder="#"
                          inputMode="numeric"
                        />
                        <input
                          className={inputClass}
                          value={addForm.name}
                          onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addMissingPlayer()
                          }}
                          placeholder="Nombre completo"
                        />
                        <button
                          type="button"
                          onClick={addMissingPlayer}
                          disabled={addingPlayer}
                          className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:col-span-1"
                        >
                          {addingPlayer ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          Agregar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {renderTeamPanel("home")}
                {renderTeamPanel("away")}
              </div>

              <div className="sticky bottom-3 z-20 space-y-2">
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg",
                        message.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white",
                      )}
                    >
                      {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                      <span className="flex-1">{message.text}</span>
                      <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar" className="opacity-80 hover:opacity-100">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {gamePlayers.length > 0 && (
                  <div className="flex items-center gap-3 rounded-full bg-brand-ink p-1.5 pl-5 text-white shadow-xl">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold sm:text-sm">
                        {playersWithData} de {gamePlayers.length} jugadores con datos
                      </p>
                      <div className="hidden gap-3 text-[11px] text-white/70 sm:flex">
                        {gameTotals.map((f) => (
                          <span key={f.key} className="inline-flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />
                            {f.short} <strong className="text-white">{f.total}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:brightness-110 disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"

function Stepper({
  label,
  title,
  value,
  activeClass,
  onChange,
  onStep,
}: {
  label: string
  title: string
  value: number
  activeClass: string
  onChange: (value: number) => void
  onStep: (delta: number) => void
}) {
  const active = value > 0
  return (
    <div className={cn("rounded-xl ring-1 transition-colors", active ? activeClass : "bg-white text-slate-400 ring-slate-200")} title={title}>
      <span className="block pt-1 text-center text-[9px] font-bold uppercase tracking-wide sm:hidden">{label}</span>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={!active}
          className="flex h-8 w-6 shrink-0 items-center justify-center rounded-l-xl transition hover:bg-black/5 disabled:opacity-30 sm:w-7"
          aria-label={`Restar ${title}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
          className={cn(
            "h-8 w-full min-w-0 bg-transparent text-center font-display text-base font-extrabold italic tabular-nums focus:outline-none",
            active ? "" : "text-slate-400",
          )}
          aria-label={title}
        />
        <button
          type="button"
          onClick={() => onStep(1)}
          className="flex h-8 w-6 shrink-0 items-center justify-center rounded-r-xl transition hover:bg-black/5 sm:w-7"
          aria-label={`Sumar ${title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function GamePickCard({
  game,
  count,
  homeTeam,
  awayTeam,
  onSelect,
}: {
  game: Game
  count: number
  homeTeam?: Team
  awayTeam?: Team
  onSelect: () => void
}) {
  const parts = gameDateParts(game.game_date)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300"
    >
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-slate-50 py-1.5 ring-1 ring-slate-200">
        {parts ? (
          <>
            <span className="text-[8px] font-bold tracking-widest text-slate-500">{parts.weekday}</span>
            <span className="font-display text-lg font-extrabold italic leading-none text-slate-900">{parts.day}</span>
            <span className="text-[8px] font-bold tracking-widest text-brand-pink">{parts.month}</span>
          </>
        ) : (
          <span className="py-1 text-xs font-bold text-slate-400">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {[
          { name: game.home_team, team: homeTeam },
          { name: game.away_team, team: awayTeam },
        ].map((side, i) => (
          <div key={i} className="flex min-w-0 items-center gap-2">
            <TeamAvatar
              name={side.name}
              logoUrl={side.team?.logo_url}
              color1={side.team?.color1}
              color2={side.team?.color2}
              size="sm"
              className="!h-6 !w-6 !text-[10px] !ring-1"
            />
            <span className="truncate text-sm font-semibold text-slate-900">{side.name}</span>
          </div>
        ))}
        <p className="truncate text-[11px] text-slate-500">
          {getCategoryLabel(game.category)}
          {game.jornada != null && game.jornada !== "" ? ` · J${game.jornada}` : ""}
          {game.game_time ? ` · ${formatGameTime(game.game_time)}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
          count > 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700",
        )}
      >
        {count > 0 ? `✓ ${count}` : "Pendiente"}
      </span>
    </button>
  )
}

function SelectedGameHeader({
  game,
  homeTeam,
  awayTeam,
  count,
  onChange,
}: {
  game: Game
  homeTeam?: Team
  awayTeam?: Team
  count: number
  onChange: () => void
}) {
  const parts = gameDateParts(game.game_date)
  const showScore = game.status === "finalizado" || game.status === "en vivo" || game.status === "en_vivo"
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-ink p-4 text-white shadow-lg sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-brand-gradient" aria-hidden />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
        <div className="space-y-2 sm:hidden">
          {[
            { name: game.home_team, team: homeTeam, score: game.home_score },
            { name: game.away_team, team: awayTeam, score: game.away_score },
          ].map((side, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <TeamAvatar name={side.name} logoUrl={side.team?.logo_url} color1={side.team?.color1} color2={side.team?.color2} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold">{side.name}</span>
              {showScore && <span className="font-display text-2xl font-extrabold italic tabular-nums">{side.score ?? 0}</span>}
            </div>
          ))}
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
            <span className="truncate text-sm font-bold sm:text-base">{game.home_team}</span>
            <TeamAvatar name={game.home_team} logoUrl={homeTeam?.logo_url} color1={homeTeam?.color1} color2={homeTeam?.color2} size="md" />
          </div>
          <div className="w-16 shrink-0 text-center">
            {showScore ? (
              <span className="font-display text-2xl font-extrabold italic tabular-nums">
                {game.home_score ?? 0}
                <span className="mx-1 text-white/40">-</span>
                {game.away_score ?? 0}
              </span>
            ) : (
              <span className="font-display text-lg font-extrabold italic text-white/50">VS</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamAvatar name={game.away_team} logoUrl={awayTeam?.logo_url} color1={awayTeam?.color1} color2={awayTeam?.color2} size="md" />
            <span className="truncate text-sm font-bold sm:text-base">{game.away_team}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            {getCategoryLabel(game.category)}
          </span>
          {game.jornada != null && game.jornada !== "" && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">J{game.jornada}</span>
          )}
          {parts && (
            <span className="inline-flex items-center gap-1 text-xs text-white/70">
              <Clock className="h-3.5 w-3.5" />
              {parts.weekday} {parts.day} {parts.month}
              {game.game_time ? ` · ${formatGameTime(game.game_time)}` : ""}
            </span>
          )}
          {game.field && (
            <span className="inline-flex items-center gap-1 text-xs text-white/70">
              <MapPin className="h-3.5 w-3.5" />
              {game.field}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
              count > 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/20 text-amber-200",
            )}
          >
            {count > 0 ? "Ya capturado" : "Sin stats"}
          </span>
          <button
            type="button"
            onClick={onChange}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-white/90"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Cambiar partido
          </button>
        </div>
      </div>
    </div>
  )
}
