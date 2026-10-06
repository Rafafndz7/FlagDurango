"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Users, Trophy, ArrowRight, Clock, Search, Filter, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLoader, PageHero, brandButtonClass, ghostButtonClass } from "@/components/ui-v2/brand"
import { Reveal } from "@/components/ui-v2/motion"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"

interface Team {
  id: number
  name: string
  category: string
  logo_url?: string
  color1: string
  color2: string
  is_institutional?: boolean
  coordinator_name?: string
  coordinator_phone?: string
  captain_photo_url?: string
  captain_name?: string
  captain_phone?: string
  coach_name?: string
  coach_phone?: string
  coach_photo_url?: string
  stats?: {
    games_played: number
    wins: number
    losses: number
    draws: number
    points: number
    points_for: number
    points_against: number
  }
}

interface Game {
  id: number
  home_team: string
  away_team: string
  home_score?: number
  away_score?: number
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  status: string
  mvp?: string
  match_type?: string
  jornada?: number
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setCategoryFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [teamsResponse, gamesResponse] = await Promise.all([fetch("/api/teams"), fetch("/api/games")])

      const [teamsData, gamesData] = await Promise.all([teamsResponse.json(), gamesResponse.json()])

      if (teamsData.success) {
        setTeams(teamsData.data || [])
      } else {
        setError(teamsData.message || "Error al cargar equipos")
      }

      if (gamesData.success) {
        setGames(gamesData.data || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Error de conexión al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      "varonil-libre": "Varonil Libre",
      "femenil-gold": "Femenil Gold",
      "femenil-silver": "Femenil Silver",
      "femenil-cooper": "Femenil Cooper A",
      "femenil-cooper-a": "Femenil Cooper A",
      "femenil-cooper-b": "Femenil Cooper B",
      "mixto-gold": "Mixto Gold",
      "mixto-silver": "Mixto Silver",
      teens: "Teens",
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "varonil-libre": "bg-blue-500",
      "femenil-gold": "bg-pink-500",
      "femenil-silver": "bg-pink-400",
      "femenil-cooper": "bg-pink-600",
      "femenil-cooper-a": "bg-pink-600",
      "femenil-cooper-b": "bg-fuchsia-700",
      "mixto-gold": "bg-orange-500",
      "mixto-silver": "bg-orange-400",
      teens: "bg-green-500",
    }
    return colors[category] || "bg-gray-500"
  }

  const getTeamRecentGames = (teamName: string) => {
    return games
      .filter((game) => (game.home_team === teamName || game.away_team === teamName) && game.status === "finalizado")
      .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      .slice(0, 3)
  }

  // Filtrar equipos
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || team.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(teams.map((team) => team.category)))

  if (loading) {
    return <BrandLoader label="Cargando equipos…" />
  }

  if (error) {
    return (
      <div className="ui-v2 flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-3xl bg-red-50 px-8 py-6 text-center text-lg font-semibold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      </div>
    )
  }

  const chips = [
    { value: "all", label: "Todas", count: teams.length },
    ...categories.map((c) => ({ value: c, label: getCategoryLabel(c), count: teams.filter((t) => t.category === c).length })),
  ]

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <PageHero
        eyebrow="Equipos - Liga Flag Durango"
        title="Equipos"
        highlight="2026"
        description={
          <>
            Conoce a todos los equipos participantes en la temporada actual.
            <span className="mt-2 block font-semibold text-amber-300">¡{teams.length} equipos registrados!</span>
          </>
        }
      >
        <button className={brandButtonClass} onClick={() => (window.location.href = "/partidos")}>
          <Trophy className="h-5 w-5" />
          Ver Partidos
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-orange to-brand-pink px-7 py-3.5 font-bold text-white shadow-brand transition-transform hover:scale-[1.03]"
          onClick={() => (window.location.href = "/estadisticas")}
        >
          <Users className="h-5 w-5" />
          Estadísticas
        </button>
        <button className={ghostButtonClass} onClick={() => (window.location.href = "/")}>
          Inicio
          <ArrowRight className="h-5 w-5" />
        </button>
      </PageHero>

      <div className="container relative z-10 mx-auto -mt-10 px-4">
        <Reveal className="rounded-3xl bg-white/90 p-4 shadow-xl ring-1 ring-slate-200 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Buscar equipos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-full border-0 bg-slate-100 pl-11 pr-4 text-sm text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-11 rounded-full border-0 bg-slate-100 px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-500">
              <span className="font-display text-2xl font-extrabold italic text-slate-900">{filteredTeams.length}</span> de{" "}
              {teams.length} equipos
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap">
            {chips.map((chip) => {
              const active = selectedCategory === chip.value
              return (
                <button
                  key={chip.value}
                  onClick={() => setCategoryFilter(chip.value)}
                  className={cn(
                    "relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="team-category-chip"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-brand"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">
                    {chip.label} ({chip.count})
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>
      </div>

      <div className="container mx-auto px-4 py-14">
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredTeams.map((team, index) => {
              const teamRecentGames = getTeamRecentGames(team.name)
              const c1 = team.color1 || "#0857b5"
              const c2 = team.color2 || "#e266be"

              return (
                <motion.div
                  key={team.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.03 }}
                  whileHover={{ y: -6 }}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-2xl"
                >
                  <div className="relative h-24" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                    <div className="absolute inset-0 bg-grid-white opacity-40" aria-hidden />
                    <div className="absolute right-3 top-3 flex gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase text-white shadow",
                          getCategoryColor(team.category),
                        )}
                      >
                        {getCategoryLabel(team.category)}
                      </span>
                    </div>
                  </div>

                  <div className="-mt-10 flex flex-1 flex-col px-5 pb-5">
                    <TeamAvatar
                      name={team.name}
                      logoUrl={team.logo_url}
                      color1={team.color1}
                      color2={team.color2}
                      size="xl"
                      className="ring-4 transition-transform duration-300 group-hover:scale-105"
                    />
                    <h3 className="mt-3 text-lg font-bold leading-tight text-slate-900">{team.name}</h3>
                    {team.is_institutional && (
                      <span className="mt-1.5 w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Institucional
                      </span>
                    )}

                    {team.stats && (
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[
                          { l: "PJ", v: team.stats.games_played },
                          { l: "G", v: team.stats.wins },
                          { l: "P", v: team.stats.losses },
                          { l: "E", v: team.stats.draws },
                          { l: "PF", v: team.stats.points_for },
                          { l: "Pts", v: team.stats.points },
                        ].map((s) => (
                          <div key={s.l} className="rounded-xl bg-slate-50 py-2 ring-1 ring-slate-100">
                            <div className="font-display text-xl font-extrabold italic leading-none text-slate-900">{s.v}</div>
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {teamRecentGames.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          Últimos Resultados
                        </h4>
                        <div className="space-y-1.5">
                          {teamRecentGames.map((game) => {
                            const isHome = game.home_team === team.name
                            const opponent = isHome ? game.away_team : game.home_team
                            const teamScore = isHome ? game.home_score : game.away_score
                            const opponentScore = isHome ? game.away_score : game.home_score
                            const won = teamScore! > opponentScore!

                            return (
                              <div key={game.id} className="flex items-center gap-2 text-xs text-slate-600">
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white",
                                    won ? "bg-emerald-500" : "bg-red-500",
                                  )}
                                >
                                  {won ? "G" : "P"}
                                </span>
                                <span className="flex-1 truncate">vs {opponent}</span>
                                <span className={cn("font-bold tabular-nums", won ? "text-emerald-600" : "text-red-600")}>
                                  {teamScore}-{opponentScore}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(team.coach_name || team.coach_photo_url || team.captain_name || team.captain_photo_url) && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-slate-200 pt-4">
                        {(team.coach_name || team.coach_photo_url) && (
                          <StaffRow
                            photo={team.coach_photo_url}
                            role="Coach"
                            name={team.coach_name || "Coach"}
                            alt={`Coach ${team.coach_name || "del equipo"}`}
                            tone="blue"
                            icon={<Trophy className="h-4 w-4" />}
                          />
                        )}
                        {(team.captain_name || team.captain_photo_url) && (
                          <StaffRow
                            photo={team.captain_photo_url}
                            role="Capitan"
                            name={team.captain_name || "Capitan"}
                            alt={`Cap ${team.captain_name || "del equipo"}`}
                            tone="amber"
                            icon={<Users className="h-4 w-4" />}
                          />
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-5">
                      <button
                        onClick={() => (window.location.href = `/equipos/${team.id}`)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-blue"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {filteredTeams.length === 0 && (
          <Reveal className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">No hay equipos</h3>
            <p className="text-slate-600">
              {searchTerm || selectedCategory !== "all"
                ? "Intenta ajustar tus filtros de búsqueda"
                : "Aún no hay equipos registrados en la liga."}
            </p>
          </Reveal>
        )}
      </div>

      <section className="relative overflow-hidden bg-brand-gradient-animated py-20">
        <div className="absolute inset-0 bg-grid-white opacity-40" aria-hidden />
        <Reveal className="container relative mx-auto px-4 text-center">
          <h2 className="font-display text-5xl font-extrabold uppercase italic tracking-tight text-white md:text-6xl">
            ¿Quieres unirte?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/90">Registra tu equipo y forma parte de la Liga Flag Durango</p>
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

function StaffRow({
  photo,
  role,
  name,
  alt,
  tone,
  icon,
}: {
  photo?: string
  role: string
  name: string
  alt: string
  tone: "blue" | "amber"
  icon: ReactNode
}) {
  const [broken, setBroken] = useState(false)
  const toneRing = tone === "blue" ? "ring-brand-blue/40 bg-blue-50 text-brand-blue" : "ring-amber-400/60 bg-amber-50 text-amber-600"
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2", toneRing)}>
        {photo && !broken ? (
          <img
            src={photo}
            alt={alt}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 text-sm">
        <p className={cn("text-[11px] font-bold uppercase tracking-wide", tone === "blue" ? "text-brand-blue" : "text-amber-700")}>
          {role}
        </p>
        <p className="truncate font-semibold text-slate-900">{name}</p>
      </div>
    </div>
  )
}
