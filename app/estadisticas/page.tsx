"use client"

import { Suspense, useState, useEffect, useMemo, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { SeasonSelector } from "@/components/season-selector"
import { Trophy, Target, Users, TrendingUp, Award, Star, BarChart3, Crown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLoader, PageHero, ghostButtonClass } from "@/components/ui-v2/brand"
import { CountUp, HoverLift, Reveal, Stagger, StaggerItem } from "@/components/ui-v2/motion"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"

interface TeamStats {
  team_id: number
  team_name: string
  team_category: string
  team_logo?: string
  team_color1: string
  team_color2: string
  position: number
  games_played: number
  games_won: number
  games_lost: number
  games_tied: number
  points: number
  points_for: number
  points_against: number
  point_difference: number
  win_percentage: string
}

interface WeeklyMVP {
  id: number
  mvp_type: "weekly"
  category: string
  week_number?: number | null
  season?: string | null
  notes?: string | null
  created_at: string
  players?: {
    id: number
    name: string
    photo_url?: string | null
    team_id?: number | null
    teams?: { id: number; name: string; logo_url?: string | null; color1?: string; color2?: string } | null
  } | null
}

interface MVPStats {
  player_id: number
  player_name: string
  team_name: string
  team_logo?: string | null
  team_color1?: string
  team_color2?: string
  photo_url?: string | null
  mvp_count: number
  weighted_mvp_count: number
  categories: string[]
  latest_mvp_date: string
  weekly_mvps: number
  game_mvps: number
}

interface GameLite {
  id: number
  category: string
  status: string
}

function normalizeCategory(v: string) {
  return (v || "").toLowerCase().replace(/_/g, "-").trim()
}

function EstadisticasPageContent() {
  const searchParams = useSearchParams()
  const selectedSeason = searchParams.get("season")
  const [stats, setStats] = useState<TeamStats[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewType, setViewType] = useState<"teams" | "mvps">("teams")
  const [loading, setLoading] = useState(true)
  const [mvps, setMvps] = useState<WeeklyMVP[]>([])
  const [mvpStats, setMvpStats] = useState<MVPStats[]>([])
  const [games, setGames] = useState<GameLite[]>([])
  const [enabledCategories, setEnabledCategories] = useState<string[]>([])

  const ALL_CATEGORIES: { value: string; label: string }[] = [
    { value: "varonil-libre", label: "Varonil Libre" },
    { value: "varonil-master", label: "Varonil Master" },
    { value: "varonil-gold", label: "Varonil Gold" },
    { value: "varonil-cooper", label: "Varonil Cooper" },
    { value: "varonil-silver", label: "Varonil Silver" },
    { value: "femenil-gold", label: "Femenil Gold" },
    { value: "femenil-silver", label: "Femenil Silver" },
    { value: "femenil-cooper-a", label: "Femenil Cooper A" },
    { value: "femenil-cooper-b", label: "Femenil Cooper B" },
    { value: "mixto-gold", label: "Mixto Gold" },
    { value: "mixto-silver", label: "Mixto Silver" },
    { value: "mixto-cooper", label: "Mixto Cooper" },
    { value: "mixto-recreativo", label: "Mixto Recreativo" },
    { value: "teens", label: "Teens" },
  ]

  const categories = [
    { value: "all", label: "Todas las Categorias" },
    ...(enabledCategories.length > 0
      ? ALL_CATEGORIES.filter((c) => enabledCategories.includes(c.value))
      : ALL_CATEGORIES),
  ]

  useEffect(() => {
    const loadEnabledCategories = async () => {
      try {
        const res = await fetch("/api/system-config")
        const data = await res.json()
        if (data.success) {
          const cfg = data.data.find((c: any) => c.config_key === "enabled_categories")
          if (cfg?.config_value) {
            try {
              const parsed = JSON.parse(cfg.config_value)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEnabledCategories(parsed)
              }
            } catch {}
          }
        }
      } catch {}
    }
    loadEnabledCategories()
    fetchMvps()
    fetchGames()
  }, [selectedSeason])

  useEffect(() => {
    if (viewType === "teams") {
      fetchStats()
    } else if (viewType === "mvps") {
      fetchMvpStats()
    }
  }, [selectedCategory, viewType, selectedSeason])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const seasonParam = selectedSeason ? `&season=${encodeURIComponent(selectedSeason)}` : ""
      const response = await fetch(`/api/stats?category=${selectedCategory}${seasonParam}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMvps = async () => {
    try {
      const seasonParam = selectedSeason ? `?season=${encodeURIComponent(selectedSeason)}` : ""
      const response = await fetch(`/api/mvps/weekly${seasonParam}`)
      const data = await response.json()
      if (data.success) {
        setMvps(data.data || [])
      }
    } catch (e) {
      console.error("Error fetching weekly MVPs:", e)
    }
  }

  const fetchMvpStats = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (selectedCategory !== "all") query.set("category", selectedCategory)
      if (selectedSeason) query.set("season", selectedSeason)
      const response = await fetch(`/api/mvps/stats?${query.toString()}`)
      const data = await response.json()
      if (data.success) {
        setMvpStats(data.data || [])
      }
    } catch (e) {
      console.error("Error fetching MVP stats:", e)
    } finally {
      setLoading(false)
    }
  }

  const fetchGames = async () => {
    try {
      const seasonParam = selectedSeason ? `?season=${encodeURIComponent(selectedSeason)}` : ""
      const res = await fetch(`/api/games${seasonParam}`)
      const json = await res.json()
      if (json.success) {
        const list: GameLite[] = (json.data || []).map((g: any) => ({
          id: g.id,
          category: g.category,
          status: g.status,
        }))
        setGames(list)
      }
    } catch (e) {
      console.error("Error fetching games:", e)
    }
  }

  const filteredLatestMvp = useMemo(() => {
    if (!mvps || mvps.length === 0) return null
    if (selectedCategory === "all") return null
    const target = normalizeCategory(selectedCategory)
    return mvps.find((m) => normalizeCategory(m.category) === target) || null
  }, [mvps, selectedCategory])

  const latestMvpsAnyCategory = useMemo(() => {
    if (!mvps || mvps.length === 0) return []
    return mvps.slice(0, 6)
  }, [mvps])

  const getCategoryColor = (category: string) => {
    if (category.includes("femenil")) return "bg-pink-500"
    if (category.includes("mixto")) return "bg-orange-500"
    if (category === "teens") return "bg-green-500"
    if (category.includes("varonil")) return "bg-blue-500"
    return "bg-gray-500"
  }

  const getPositionColor = (position: number) => {
    if (position === 1) return "text-yellow-600"
    if (position === 2) return "text-gray-500"
    if (position === 3) return "text-orange-600"
    return "text-gray-900"
  }

  const totalGamesDistinct = useMemo(() => {
    let list = games.filter((g) => String(g.status).toLowerCase() === "finalizado")
    if (selectedCategory !== "all") {
      const target = normalizeCategory(selectedCategory)
      list = list.filter((g) => normalizeCategory(g.category) === target)
    }
    return list.length
  }, [games, selectedCategory])


  const totalPointsFor = stats.reduce((sum, team) => sum + team.points_for, 0)
  const podiumTeams = selectedCategory !== "all" && stats.length >= 3 ? stats.slice(0, 3) : []
  const podiumMvps = mvpStats.length >= 3 ? mvpStats.slice(0, 3) : []
  const categoryLabel = (value: string) => ALL_CATEGORIES.find((c) => c.value === value)?.label || value.replace("-", " ")

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <PageHero
        eyebrow="Estadísticas - Liga Flag Durango"
        title="Estadísticas"
        highlight="por temporada"
        description={
          <>
            Tabla de posiciones y estadísticas completas de todos los equipos.
            <span className="mt-2 block font-semibold text-amber-300">¡Sigue el rendimiento de tu equipo!</span>
          </>
        }
      />

      <div className="container relative z-10 mx-auto -mt-10 px-4">
        <Reveal className="rounded-3xl bg-white/90 p-4 shadow-xl ring-1 ring-slate-200 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-full rounded-full bg-slate-100 p-1 ring-1 ring-slate-200 md:w-auto">
              {[
                { value: "teams" as const, label: "Estadísticas de Equipos", Icon: BarChart3 },
                { value: "mvps" as const, label: "MVPs", Icon: Star },
              ].map(({ value, label, Icon }) => {
                const active = viewType === value
                return (
                  <button
                    key={value}
                    onClick={() => setViewType(value)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors md:flex-none",
                      active ? "text-white" : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="stats-view-toggle"
                        className={cn(
                          "absolute inset-0 rounded-full shadow-brand",
                          value === "teams" ? "bg-brand-gradient" : "bg-gradient-to-r from-amber-400 to-orange-500",
                        )}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{label}</span>
                  </button>
                )
              })}
            </div>
            <SeasonSelector />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap">
            {categories.map((category) => {
              const active = selectedCategory === category.value
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={cn(
                    "relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="stats-category-chip"
                      className="absolute inset-0 rounded-full bg-slate-900"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{category.label}</span>
                </button>
              )
            })}
          </div>
        </Reveal>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="font-display text-4xl font-extrabold uppercase italic tracking-tight text-slate-900 md:text-5xl">
            Estadísticas
          </h2>
          <p className="mt-2 text-slate-600">
            {viewType === "teams" ? "Tabla de posiciones y estadísticas de equipos" : "Ranking de jugadores MVP"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
                ))}
              </div>
              <div className="h-96 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
            </motion.div>
          ) : viewType === "teams" ? (
            <motion.div
              key={`teams-${selectedCategory}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 ring-1 ring-amber-200/70">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" aria-hidden />
                <h3 className="relative mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                    <Award className="h-5 w-5" />
                  </span>
                  MVP de la Jornada
                </h3>
                {selectedCategory !== "all" && filteredLatestMvp ? (
                  <div className="relative flex items-center gap-5">
                    <PlayerPhoto
                      src={filteredLatestMvp.players?.photo_url}
                      alt={filteredLatestMvp.players?.name || "MVP"}
                      className="h-20 w-20 ring-4 ring-amber-300"
                    />
                    <div>
                      <div className="font-display text-3xl font-extrabold uppercase italic leading-none text-slate-900">
                        {filteredLatestMvp.players?.name || "—"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {filteredLatestMvp.players?.teams?.name || "Equipo"}{" "}
                        {filteredLatestMvp.week_number ? `• Semana ${filteredLatestMvp.week_number}` : ""}
                      </div>
                      <span
                        className={cn(
                          "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white",
                          getCategoryColor(filteredLatestMvp.category),
                        )}
                      >
                        {filteredLatestMvp.category.replace("-", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : selectedCategory === "all" ? (
                  <Stagger className="relative grid grid-cols-1 gap-3 md:grid-cols-3" stagger={0.05}>
                    {latestMvpsAnyCategory.map((mvp) => (
                      <StaggerItem key={mvp.id}>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-amber-100 transition-shadow hover:shadow-md">
                          <PlayerPhoto
                            src={mvp.players?.photo_url}
                            alt={mvp.players?.name || "MVP"}
                            className="h-14 w-14 ring-2 ring-amber-200"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{mvp.players?.name || "—"}</div>
                            <div className="truncate text-xs text-slate-600">
                              {mvp.players?.teams?.name || "Equipo"} {mvp.week_number ? `• Semana ${mvp.week_number}` : ""}
                            </div>
                            <span
                              className={cn(
                                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                                getCategoryColor(mvp.category),
                              )}
                            >
                              {mvp.category.replace("-", " ").toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                    {latestMvpsAnyCategory.length === 0 && <div className="text-slate-600">Aún no hay MVPs registrados.</div>}
                  </Stagger>
                ) : (
                  <div className="relative text-slate-600">Aún no hay MVP de la jornada para esta categoría.</div>
                )}
              </div>

              <Stagger className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile icon={<Users className="h-5 w-5" />} tint="from-brand-blue to-sky-400" label="Total Equipos" hint="En la categoría seleccionada">
                  <CountUp value={stats.length} />
                </StatTile>
                <StatTile icon={<Trophy className="h-5 w-5" />} tint="from-emerald-500 to-teal-400" label="Partidos Jugados" hint="Total de partidos">
                  <CountUp value={totalGamesDistinct} />
                </StatTile>
                <StatTile icon={<Target className="h-5 w-5" />} tint="from-brand-orange to-amber-400" label="Puntos Totales" hint="Puntos anotados">
                  <CountUp value={totalPointsFor} />
                </StatTile>
                <StatTile icon={<TrendingUp className="h-5 w-5" />} tint="from-brand-pink to-fuchsia-400" label="Promedio por Partido" hint="Puntos por partido">
                  {totalGamesDistinct > 0 ? (totalPointsFor / totalGamesDistinct).toFixed(1) : "0.0"}
                </StatTile>
              </Stagger>

              {podiumTeams.length === 3 && (
                <Podium
                  items={podiumTeams.map((t) => ({
                    key: t.team_id,
                    name: t.team_name,
                    sub: `${t.points} pts · ${t.games_won}-${t.games_lost}${t.games_tied ? `-${t.games_tied}` : ""}`,
                    avatar: (
                      <TeamAvatar
                        name={t.team_name}
                        logoUrl={t.team_logo}
                        color1={t.team_color1}
                        color2={t.team_color2}
                        size="lg"
                      />
                    ),
                  }))}
                />
              )}

              <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <h3 className="font-display text-2xl font-extrabold uppercase italic text-slate-900">Tabla de Posiciones</h3>
                  {selectedCategory !== "all" && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {categoryLabel(selectedCategory)}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 text-left font-bold">Pos</th>
                        <th className="px-4 py-3 text-left font-bold">Equipo</th>
                        <th className="px-2 py-3 text-center font-bold">PJ</th>
                        <th className="px-2 py-3 text-center font-bold">G</th>
                        <th className="px-2 py-3 text-center font-bold">E</th>
                        <th className="px-2 py-3 text-center font-bold">P</th>
                        <th className="px-2 py-3 text-center font-bold">PF</th>
                        <th className="px-2 py-3 text-center font-bold">PC</th>
                        <th className="px-2 py-3 text-center font-bold">DP</th>
                        <th className="px-2 py-3 text-center font-bold">Pts</th>
                        <th className="px-4 py-3 text-center font-bold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((team, i) => (
                        <motion.tr
                          key={team.team_id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i, 20) * 0.025, duration: 0.3 }}
                          className="border-t border-slate-100 transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <PositionBadge position={team.position} className={getPositionColor(team.position)} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <TeamAvatar
                                name={team.team_name}
                                logoUrl={team.team_logo}
                                color1={team.team_color1}
                                color2={team.team_color2}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">{team.team_name}</div>
                                <span
                                  className={cn(
                                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                                    getCategoryColor(team.team_category),
                                  )}
                                >
                                  {team.team_category.replace("-", " ").toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center text-slate-700">{team.games_played}</td>
                          <td className="px-2 py-3 text-center font-semibold text-emerald-600">{team.games_won}</td>
                          <td className="px-2 py-3 text-center font-semibold text-amber-600">{team.games_tied}</td>
                          <td className="px-2 py-3 text-center font-semibold text-red-600">{team.games_lost}</td>
                          <td className="px-2 py-3 text-center text-slate-700">{team.points_for}</td>
                          <td className="px-2 py-3 text-center text-slate-700">{team.points_against}</td>
                          <td className="px-2 py-3 text-center">
                            <span
                              className={cn(
                                "font-semibold",
                                team.point_difference > 0
                                  ? "text-emerald-600"
                                  : team.point_difference < 0
                                    ? "text-red-600"
                                    : "text-slate-400",
                              )}
                            >
                              {team.point_difference > 0 ? "+" : ""}
                              {team.point_difference}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className="inline-flex min-w-10 justify-center rounded-lg bg-brand-blue/10 px-2 py-1 font-display text-lg font-extrabold italic text-brand-blue">
                              {team.points}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 lg:block">
                                <div
                                  className="h-full rounded-full bg-brand-gradient"
                                  style={{ width: `${Math.min(100, Number(team.win_percentage) || 0)}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-slate-700">{team.win_percentage}%</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stats.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-slate-500">No hay estadísticas disponibles para esta categoría.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`mvps-${selectedCategory}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <Stagger className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile icon={<Star className="h-5 w-5" />} tint="from-amber-400 to-orange-500" label="Total MVPs" hint="Puntos MVP totales">
                  <CountUp value={mvpStats.reduce((sum, p) => sum + p.weighted_mvp_count, 0)} />
                </StatTile>
                <StatTile icon={<Users className="h-5 w-5" />} tint="from-brand-blue to-sky-400" label="Jugadores MVP" hint="Jugadores únicos">
                  <CountUp value={mvpStats.length} />
                </StatTile>
                <StatTile icon={<Trophy className="h-5 w-5" />} tint="from-violet-500 to-fuchsia-400" label="MVPs Semanales" hint="Valen 2 puntos c/u">
                  <CountUp value={mvpStats.reduce((sum, p) => sum + p.weekly_mvps, 0)} />
                </StatTile>
                <StatTile icon={<Target className="h-5 w-5" />} tint="from-emerald-500 to-teal-400" label="MVPs de Juego" hint="Valen 1 punto c/u">
                  <CountUp value={mvpStats.reduce((sum, p) => sum + p.game_mvps, 0)} />
                </StatTile>
              </Stagger>

              {podiumMvps.length === 3 && (
                <Podium
                  items={podiumMvps.map((p) => ({
                    key: p.player_id,
                    name: p.player_name,
                    sub: `${p.weighted_mvp_count} pts MVP · ${p.team_name || "Sin equipo"}`,
                    avatar: <PlayerPhoto src={p.photo_url} alt={p.player_name} className="h-16 w-16 ring-4 ring-white" />,
                  }))}
                />
              )}

              <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h3 className="font-display text-2xl font-extrabold uppercase italic text-slate-900">Ranking de Jugadores MVP</h3>
                  <p className="text-sm text-slate-500">Ordenados por puntos MVP (Semanal = 2pts, Juego = 1pt)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 text-left font-bold">Pos</th>
                        <th className="px-4 py-3 text-left font-bold">Jugador</th>
                        <th className="px-4 py-3 text-left font-bold">Equipo</th>
                        <th className="px-2 py-3 text-center font-bold">Puntos MVP</th>
                        <th className="px-2 py-3 text-center font-bold">Semanales</th>
                        <th className="px-2 py-3 text-center font-bold">De Juego</th>
                        <th className="px-4 py-3 text-center font-bold">Total MVPs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mvpStats.map((player, index) => (
                        <motion.tr
                          key={player.player_id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index, 20) * 0.025, duration: 0.3 }}
                          className="border-t border-slate-100 transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <PositionBadge position={index + 1} className={getPositionColor(index + 1)} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <PlayerPhoto src={player.photo_url} alt={player.player_name} className="h-10 w-10 ring-2 ring-slate-100" />
                              <div className="font-semibold text-slate-900">{player.player_name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <TeamAvatar
                                name={player.team_name || "E"}
                                logoUrl={player.team_logo}
                                color1={player.team_color1}
                                color2={player.team_color2}
                                size="sm"
                                className="h-7 w-7 text-xs"
                              />
                              <span className="text-slate-700">{player.team_name || "Sin equipo"}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className="inline-flex min-w-10 justify-center rounded-lg bg-violet-100 px-2 py-1 font-display text-lg font-extrabold italic text-violet-700">
                              {player.weighted_mvp_count}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center font-semibold text-amber-600">{player.weekly_mvps}</td>
                          <td className="px-2 py-3 text-center font-semibold text-emerald-600">{player.game_mvps}</td>
                          <td className="px-4 py-3 text-center font-bold text-brand-blue">{player.mvp_count}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mvpStats.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-slate-500">No hay estadísticas de MVP disponibles para esta categoría.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="relative overflow-hidden bg-brand-gradient-animated py-20">
        <div className="absolute inset-0 bg-grid-white opacity-40" aria-hidden />
        <Reveal className="container relative mx-auto px-4 text-center">
          <h2 className="font-display text-5xl font-extrabold uppercase italic tracking-tight text-white md:text-6xl">
            ¿Quieres participar?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/90">Únete a la Liga Flag Durango y forma parte de la acción</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-slate-900 shadow-xl transition-transform hover:scale-[1.03]"
              onClick={() => (window.location.href = "/register-team")}
            >
              <Users className="h-5 w-5" />
              Registrar Equipo
            </button>
            <button className={ghostButtonClass} onClick={() => (window.location.href = "/register-coach")}>
              Registrar Coach
            </button>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function StatTile({
  icon,
  tint,
  label,
  hint,
  children,
}: {
  icon: ReactNode
  tint: string
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <StaggerItem>
      <HoverLift className="h-full rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow", tint)}>
            {icon}
          </span>
        </div>
        <div className="font-display text-4xl font-black italic leading-none text-slate-900">{children}</div>
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      </HoverLift>
    </StaggerItem>
  )
}

function PositionBadge({ position, className }: { position: number; className?: string }) {
  const medal =
    position === 1
      ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow"
      : position === 2
        ? "bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow"
        : position === 3
          ? "bg-gradient-to-br from-orange-300 to-orange-600 text-white shadow"
          : "bg-slate-100"
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-extrabold italic",
        className,
        medal,
      )}
    >
      {position}
    </span>
  )
}

function PlayerPhoto({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100", className)}>
      {src && !broken ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <User className="h-1/2 w-1/2 text-slate-400" />
      )}
    </div>
  )
}

function Podium({ items }: { items: { key: number; name: string; sub: string; avatar: ReactNode }[] }) {
  const order = [1, 0, 2]
  const heights = ["h-28", "h-36", "h-20"]
  const colors = [
    "from-slate-300 to-slate-400",
    "from-amber-300 to-amber-500",
    "from-orange-300 to-orange-500",
  ]
  return (
    <div className="mb-8 grid grid-cols-3 items-end gap-3 md:gap-6">
      {order.map((idx, col) => {
        const item = items[idx]
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: col === 1 ? 0 : 0.15 + col * 0.05, type: "spring", stiffness: 160, damping: 18 }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative mb-3">
              {idx === 0 && (
                <motion.div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Crown className="h-6 w-6 fill-amber-300" />
                </motion.div>
              )}
              {item.avatar}
            </div>
            <div className="line-clamp-2 max-w-[160px] text-sm font-bold leading-tight text-slate-900 md:text-base">{item.name}</div>
            <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.sub}</div>
            <div
              className={cn(
                "mt-3 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-3 font-display text-4xl font-black italic text-white shadow-inner",
                heights[col],
                colors[col],
              )}
            >
              {idx + 1}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}


export default function EstadisticasPage() {
  return (
    <Suspense fallback={<BrandLoader label="Cargando estadísticas…" />}>
      <EstadisticasPageContent />
    </Suspense>
  )
}
