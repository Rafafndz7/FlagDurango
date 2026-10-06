"use client"

import { Suspense, useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { SeasonSelector } from "@/components/season-selector"
import { motion } from "framer-motion"
import { Calendar, Users, Trophy, ArrowRight, Search, Filter, Share2, Download, Info, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLoader, PageHero, SectionHeading, brandButtonClass, ghostButtonClass } from "@/components/ui-v2/brand"
import { Reveal, Stagger, StaggerItem } from "@/components/ui-v2/motion"
import { MatchCard } from "@/components/ui-v2/match-card"

interface Game {
  id: number
  home_team: string
  away_team: string
  home_score?: number | null
  away_score?: number | null
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  status: string
  match_type?: string
  jornada?: number
  referee1?: string | null
  referee2?: string | null
  mvp?: string | null
  stage?: string | null
  // Nuevos campos del cronómetro
  current_period?: string | null
  clock_running?: boolean | null
  clock_last_started_at?: string | null
  seconds_remaining?: number | null
}

interface Team {
  id: number
  name: string
  category: string
  color1: string
  color2: string
  logo_url?: string | null
}

const dateKey = (value: string) => String(value || "").slice(0, 10)

const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Interpreta YYYY-MM-DD como día local, sin importar la zona horaria del dispositivo */
const formatGameDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const key = dateKey(value)
  if (!key) return ""
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-MX", options)
}

// --- HOOK Y COMPONENTE PARA EL CRONÓMETRO EN VIVO ---
function useLiveTimer(game: Game) {
  const [displayTime, setDisplayTime] = useState("");

  useEffect(() => {
    const status = game.status?.toLowerCase() ?? "";
    if (status !== "en vivo" && status !== "en_vivo") {
      setDisplayTime("EN VIVO");
      return;
    }

    const updateClock = () => {
      let remaining = game.seconds_remaining ?? 1200;

      if (game.clock_running && game.clock_last_started_at) {
        const startedAt = new Date(game.clock_last_started_at).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - startedAt) / 1000);
        remaining = Math.max(0, remaining - elapsedSeconds);
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      setDisplayTime(`${game.current_period ?? '1H'} • ${timeString}`);
    };

    updateClock();

    let interval: NodeJS.Timeout;
    if (game.clock_running) {
      interval = setInterval(updateClock, 1000);
    }

    return () => clearInterval(interval);
  }, [game.status, game.clock_running, game.seconds_remaining, game.clock_last_started_at, game.current_period]);

  return displayTime;
}

function LiveTimerDisplay({ game }: { game: Game }) {
  const timeString = useLiveTimer(game);
  return (
    <div className="mt-2 rounded-full bg-red-50 px-3 py-1 font-mono text-xs font-bold tabular-nums text-red-600 ring-1 ring-red-200">
      {timeString}
    </div>
  );
}
// ----------------------------------------------------


function GamesPageContent() {
  const searchParams = useSearchParams()
  const selectedSeason = searchParams.get("season")
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [matchTypeFilter, setMatchTypeFilter] = useState("")
  const [jornadaFilter, setJornadaFilter] = useState<string>("current")
  const gameCardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const gamesUrl = selectedSeason ? `/api/games?season=${encodeURIComponent(selectedSeason)}` : "/api/games"
        const [gamesRes, teamsRes] = await Promise.all([
          fetch(gamesUrl, { cache: "no-store" }),
          fetch("/api/teams", { cache: "no-store" }),
        ])
        const [gamesData, teamsData] = await Promise.all([gamesRes.json(), teamsRes.json()])

        if (gamesData.success) {
          setGames(gamesData.data || [])
        } else {
          setError(gamesData.message || "Error al cargar partidos.")
        }

        if (teamsData.success) {
          setTeams(teamsData.data || [])
        }
      } catch (e) {
        console.error("Error fetching data:", e)
        setError("Error de red o del servidor al cargar partidos.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
    // Aumentamos un poco la frecuencia a 15 seg si quieres que los puntajes se actualicen más rápido
    const i = setInterval(loadData, 15000) 
    return () => clearInterval(i)
  }, [selectedSeason])

  const jornadas = useMemo(
    () =>
      Array.from(new Set(games.map((g) => g.jornada).filter((j): j is number => typeof j === "number"))).sort(
        (a, b) => a - b,
      ),
    [games],
  )

  /** Jornada del siguiente día con partidos pendientes; si ya no hay, la última jugada */
  const currentJornada = useMemo(() => {
    const today = localDateKey(new Date())
    const pending = games
      .filter((g) => typeof g.jornada === "number" && g.status !== "finalizado" && dateKey(g.game_date) >= today)
      .sort((a, b) => dateKey(a.game_date).localeCompare(dateKey(b.game_date)))
    if (pending.length) {
      const nextDay = dateKey(pending[0].game_date)
      return Math.min(...pending.filter((g) => dateKey(g.game_date) === nextDay).map((g) => g.jornada as number))
    }
    const played = games.filter((g) => typeof g.jornada === "number" && g.status === "finalizado")
    return played.length ? Math.max(...played.map((g) => g.jornada as number)) : null
  }, [games])

  const activeJornada: number | null =
    jornadaFilter === "all" ? null : jornadaFilter === "current" ? currentJornada : Number(jornadaFilter)

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>()
    teams.forEach((t) => map.set(t.name, t))
    return map
  }, [teams])

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "femenil-silver": "bg-pink-400",
      "femenil-gold": "bg-pink-500",
      "femenil-cooper": "bg-pink-600",
      "femenil-cooper-a": "bg-pink-600",
      "femenil-cooper-b": "bg-fuchsia-700",
      "varonil-silver": "bg-blue-400",
      "varonil-gold": "bg-blue-500",
      "varonil-libre": "bg-blue-600",
      "mixto-silver": "bg-orange-400",
      "mixto-gold": "bg-orange-500",
    }
    return colors[category] || "bg-gray-500"
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "femenil-silver": "Femenil Silver",
      "femenil-gold": "Femenil Gold",
      "femenil-cooper": "Femenil Cooper A",
      "femenil-cooper-a": "Femenil Cooper A",
      "femenil-cooper-b": "Femenil Cooper B",
      "varonil-silver": "Varonil Silver",
      "varonil-gold": "Varonil Gold",
      "varonil-libre": "Varonil Libre",
      "mixto-silver": "Mixto Silver",
      "mixto-gold": "Mixto Gold",
    }
    return labels[category] || category
  }

  const getStageLabel = (stage?: string | null) => {
    switch (stage) {
      case "quarterfinal":
        return "Cuartos"
      case "semifinal":
        return "Semifinal"
      case "final":
        return "Final"
      case "third_place":
        return "Tercer Lugar"
      default:
        return "Temporada"
    }
  }

  const getReferees = (game: Game) => {
    const refs = [game.referee1, game.referee2].filter(Boolean)
    return refs.length > 0 ? refs.join(", ") : "Sin asignar"
  }

  const getTeamLogo = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName)
    return team?.logo_url || null
  }

  const getTeamColors = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName)
    return {
      color1: team?.color1 || "#3B82F6",
      color2: team?.color2 || "#1E40AF",
    }
  }

  const filteredGames = (gamesList: Game[]) => {
    return gamesList.filter((game) => {
      const matchesSearch =
        !searchTerm ||
        game.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.venue.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = !categoryFilter || game.category === categoryFilter
      const matchesStatus = !statusFilter || normalizedStatus(game.status) === statusFilter
      const matchesMatchType = !matchTypeFilter || game.match_type === matchTypeFilter
      const matchesJornada = activeJornada == null || game.jornada === activeJornada

      return matchesSearch && matchesCategory && matchesStatus && matchesMatchType && matchesJornada
    })
  }

  if (loading) {
    return <BrandLoader label="Cargando partidos…" />
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

  const normalizedStatus = (s: string) => (s === "en vivo" || s === "en_vivo" ? "en_vivo" : s)

  const liveGames = filteredGames(games.filter((g) => normalizedStatus(g.status) === "en_vivo"))
  const upcomingGames = filteredGames(
    games
      .filter((g) => normalizedStatus(g.status) === "programado")
      .sort(
        (a, b) =>
          dateKey(a.game_date).localeCompare(dateKey(b.game_date)) ||
          String(a.game_time || "").localeCompare(String(b.game_time || "")),
      ),
  )
  const finishedGames = filteredGames(
    games
      .filter((g) => normalizedStatus(g.status) === "finalizado")
      .sort(
        (a, b) =>
          dateKey(b.game_date).localeCompare(dateKey(a.game_date)) ||
          String(a.game_time || "").localeCompare(String(b.game_time || "")),
      ),
  )

  const getTeam = (name: string) => teamMap.get(name)

  const stageBadge = (game: Game) =>
    game.stage && game.stage !== "regular" ? (
      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold uppercase text-violet-700">
        {getStageLabel(game.stage)}
      </span>
    ) : null

  const amistosoBadge = (
    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase text-orange-700">🤝 Amistoso</span>
  )

  const amistosoNotice = (text: string) => (
    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
      <Info className="h-4 w-4 shrink-0" />
      {text}
    </div>
  )

  const shareGame = async (game: Game) => {
    try {
      const html2canvas = (await import("html2canvas")).default

      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.top = "-9999px"
      document.body.appendChild(tempContainer)

      const isAmistoso = game.match_type === "amistoso"
      const shareCardElement = document.createElement("div")
      shareCardElement.innerHTML = `
        <div style="width: 600px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.15);">
          <div style="height: 80px; background: linear-gradient(135deg, #2563eb, #7c3aed, #dc2626); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
            🏈 Liga Flag Durango
          </div>

          <div style="display: flex; justify-content: center; padding: 16px 0; background: #f8fafc;">
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 8px 24px; border-radius: 9999px; font-weight: bold; font-size: 18px;">
              🏈 ${game.status === "programado" ? "PRÓXIMO PARTIDO" : game.status === "en_vivo" || game.status === "en vivo" ? "EN VIVO" : "FINALIZADO"}
            </div>
          </div>

          ${
            isAmistoso
              ? `
          <div style="background: #fff7ed; border: 2px solid #fb923c; margin: 16px; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <svg style="width: 20px; height: 20px; color: #ea580c;" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <span style="color: #9a3412; font-weight: 600; font-size: 14px;">🤝 Partido Amistoso - No cuenta para estadísticas</span>
          </div>
          `
              : ""
          }

          <div style="background: linear-gradient(135deg, #dbeafe, #e0e7ff); padding: 32px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 32px;">
              <div style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                <div style="height: 80px; width: 80px; border-radius: 50%; background: linear-gradient(135deg, ${getTeamColors(game.home_team).color1}, ${getTeamColors(game.home_team).color2}); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin-bottom: 12px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ${getTeamLogo(game.home_team) ? `<img src="${getTeamLogo(game.home_team)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : game.home_team.charAt(0)}
                </div>
                <span style="font-weight: bold; font-size: 18px; color: #1f2937; text-align: center; max-width: 120px; line-height: 1.2;">${game.home_team}</span>
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 100px;">
                ${
                  game.status === "finalizado"
                    ? `<div style="font-size: 48px; font-weight: bold; color: #1f2937;">${game.home_score ?? 0} - ${game.away_score ?? 0}</div>`
                    : game.status === "en_vivo" || game.status === "en vivo"
                      ? `<div style="font-size: 48px; font-weight: bold; color: #dc2626;">${game.home_score ?? 0} - ${game.away_score ?? 0}</div><div style="font-size: 12px; color: #dc2626; font-weight: bold;">EN VIVO</div>`
                      : `<div style="font-size: 48px; font-weight: bold; color: #1f2937;">VS</div>`
                }
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                <div style="height: 80px; width: 80px; border-radius: 50%; background: linear-gradient(135deg, ${getTeamColors(game.away_team).color1}, ${getTeamColors(game.away_team).color2}); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin-bottom: 12px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ${getTeamLogo(game.away_team) ? `<img src="${getTeamLogo(game.away_team)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : game.away_team.charAt(0)}
                </div>
                <span style="font-weight: bold; font-size: 18px; color: #1f2937; text-align: center; max-width: 120px; line-height: 1.2;">${game.away_team}</span>
              </div>
            </div>
          </div>

          <div style="padding: 24px; background: white; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 8px;">
              <span style="background: ${getCategoryColor(game.category).replace("bg-", "").replace("-400", "").replace("-500", "").replace("-600", "")}; color: white; padding: 4px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600;">
                ${getCategoryLabel(game.category)}
              </span>
              ${game.status === "programado" ? '<span style="background: #2563eb; color: white; padding: 4px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-left: 8px;">Programado</span>' : ""}
              ${isAmistoso ? '<span style="background: #ea580c; color: white; padding: 4px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600;">🤝 Amistoso</span>' : ""}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; color: #374151; font-size: 18px;">
              <svg style="width: 20px; height: 20px; margin-right: 8px; color: #3b82f6;" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
              </svg>
              ${formatGameDate(game.game_date, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; color: #374151; font-size: 18px;">
              <svg style="width: 20px; height: 20px; margin-right: 8px; color: #3b82f6;" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
              </svg>
              ${game.game_time}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; color: #374151; font-size: 18px;">
              <svg style="width: 20px; height: 20px; margin-right: 8px; color: #3b82f6;" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
              </svg>
              ${game.venue} - ${game.field}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; color: #374151; font-size: 18px;">
              <svg style="width: 20px; height: 20px; margin-right: 8px; color: #3b82f6;" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
              </svg>
              Árbitros: ${getReferees(game)}
            </div>
          </div>

          <div style="background: #1f2937; color: white; text-align: center; padding: 16px;">
            <div style="font-size: 20px; font-weight: bold;">Liga Flag Durango</div>
            <div style="font-size: 14px; color: #9ca3af;">20 años haciendo historia</div>
          </div>
        </div>
      `

      tempContainer.appendChild(shareCardElement)

      const canvas = await html2canvas(shareCardElement.firstElementChild as HTMLElement, {
        backgroundColor: "white",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: isAmistoso ? 880 : 800,
      })

      document.body.removeChild(tempContainer)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `partido-${game.home_team}-vs-${game.away_team}-${game.game_date}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, "image/png")
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Error al generar la imagen. Por favor intenta de nuevo.")
    }
  }


  const selectClass =
    "h-11 rounded-full border-0 bg-slate-100 px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"

  const jornadaChips: { value: string; label: string }[] = [
    { value: "current", label: currentJornada != null ? `Actual · J${currentJornada}` : "Actual" },
    { value: "all", label: "Todas" },
    ...jornadas.map((j) => ({ value: String(j), label: `J${j}` })),
  ]

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <PageHero
        eyebrow="Calendario de Partidos - Liga Flag Durango"
        title="Partidos"
        highlight="por temporada"
        description={
          <>
            Sigue todos los partidos de la temporada actual.
            <span className="mt-2 block font-semibold text-amber-300">¡No te pierdas ningún juego!</span>
          </>
        }
      >
        <button className={brandButtonClass} onClick={() => (window.location.href = "/equipos")}>
          <Users className="h-5 w-5" />
          Ver Equipos
        </button>
        <button className={ghostButtonClass} onClick={() => (window.location.href = "/")}>
          Inicio
          <ArrowRight className="h-5 w-5" />
        </button>
      </PageHero>

      <div className="container relative z-10 mx-auto -mt-10 px-4">
        <Reveal className="rounded-3xl bg-white/90 p-4 shadow-xl ring-1 ring-slate-200 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Buscar equipos, venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-full border-0 bg-slate-100 pl-11 pr-4 text-sm text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="hidden h-4 w-4 text-slate-400 sm:block" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
                <option value="">Todas las categorías</option>
                <option value="varonil-libre">Varonil Libre</option>
                <option value="varonil-gold">Varonil Gold</option>
                <option value="varonil-silver">Varonil Silver</option>
                <option value="femenil-gold">Femenil Gold</option>
                <option value="femenil-silver">Femenil Silver</option>
                <option value="femenil-cooper-a">Femenil Cooper A</option>
                <option value="femenil-cooper-b">Femenil Cooper B</option>
                <option value="mixto-gold">Mixto Gold</option>
                <option value="mixto-silver">Mixto Silver</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="">Todos los estados</option>
                <option value="programado">Programados</option>
                <option value="en_vivo">En Vivo</option>
                <option value="finalizado">Finalizados</option>
              </select>
              <select value={matchTypeFilter} onChange={(e) => setMatchTypeFilter(e.target.value)} className={selectClass}>
                <option value="">Todos los tipos</option>
                <option value="jornada">Jornada</option>
                <option value="amistoso">Amistoso</option>
                <option value="playoff">Playoff</option>
              </select>
              <SeasonSelector />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">Jornada</span>
            {jornadaChips.map((chip) => {
              const active = jornadaFilter === chip.value
              return (
                <button
                  key={chip.value}
                  onClick={() => setJornadaFilter(chip.value)}
                  className={cn(
                    "relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="jornada-chip"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-brand"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{chip.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" /> {liveGames.length} en vivo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-brand-blue">
              <span className="h-2 w-2 rounded-full bg-brand-blue" /> {upcomingGames.length} programados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {finishedGames.length} finalizados
            </span>
          </div>
        </Reveal>
      </div>

      <div className="container mx-auto px-4 py-14">
        {liveGames.length > 0 && (
          <section className="mb-20">
            <SectionHeading
              icon={<Radio className="h-6 w-6" />}
              title="Partidos en vivo"
              subtitle="Partidos que se están jugando ahora mismo"
            />
            <Stagger className="grid gap-6 md:grid-cols-2">
              {liveGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <StaggerItem key={game.id} className="h-full">
                    <MatchCard
                      ref={(el) => {
                        gameCardRefs.current[game.id] = el
                      }}
                      game={game}
                      variant="live"
                      categoryLabel={getCategoryLabel(game.category)}
                      getTeam={getTeam}
                      refereesText={getReferees(game)}
                      liveSlot={<LiveTimerDisplay game={game} />}
                      badges={
                        <>
                          {isAmistoso && amistosoBadge}
                          {stageBadge(game)}
                        </>
                      }
                      notice={isAmistoso ? amistosoNotice("🤝 Partido Amistoso - No cuenta para estadísticas oficiales") : null}
                      footer={
                        <button onClick={() => shareGame(game)} className={cn(brandButtonClass, "w-full py-2.5 text-sm")}>
                          <Share2 className="h-4 w-4" />
                          Compartir
                        </button>
                      }
                    />
                  </StaggerItem>
                )
              })}
            </Stagger>
          </section>
        )}

        <section className="mb-20">
          <SectionHeading
            icon={<Calendar className="h-6 w-6" />}
            title="Próximos partidos"
            badge={
              activeJornada != null ? (
                <span className="rounded-full bg-brand-blue px-3 py-1 text-xl not-italic text-white">J{activeJornada}</span>
              ) : null
            }
            subtitle={
              activeJornada != null
                ? `Partidos programados de la jornada ${activeJornada}`
                : "Partidos programados para los próximos días"
            }
          />
          {upcomingGames.length > 0 ? (
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
              {upcomingGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <StaggerItem key={game.id} className="h-full">
                    <MatchCard
                      ref={(el) => {
                        gameCardRefs.current[game.id] = el
                      }}
                      game={game}
                      variant="upcoming"
                      categoryLabel={getCategoryLabel(game.category)}
                      getTeam={getTeam}
                      refereesText={getReferees(game)}
                      badges={
                        <>
                          {isAmistoso && amistosoBadge}
                          {stageBadge(game)}
                        </>
                      }
                      notice={isAmistoso ? amistosoNotice("🤝 Amistoso - No cuenta para estadísticas") : null}
                      footer={
                        <button
                          onClick={() => shareGame(game)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Share2 className="h-4 w-4" />
                          Compartir Partido
                        </button>
                      }
                    />
                  </StaggerItem>
                )
              })}
            </Stagger>
          ) : (
            <EmptyState
              icon={<Calendar className="h-10 w-10" />}
              title="No hay partidos programados"
              text="Los próximos partidos aparecerán aquí una vez que sean programados."
            />
          )}
        </section>

        <section className="mb-8">
          <SectionHeading
            icon={<Trophy className="h-6 w-6" />}
            title="Partidos finalizados"
            badge={
              activeJornada != null ? (
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xl not-italic text-white">J{activeJornada}</span>
              ) : null
            }
            subtitle={
              activeJornada != null ? `Resultados de la jornada ${activeJornada}` : "Resultados de los partidos más recientes"
            }
          />
          {finishedGames.length > 0 ? (
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
              {finishedGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <StaggerItem key={game.id} className="h-full">
                    <MatchCard
                      ref={(el) => {
                        gameCardRefs.current[game.id] = el
                      }}
                      game={isAmistoso ? { ...game, mvp: null } : game}
                      variant="final"
                      categoryLabel={getCategoryLabel(game.category)}
                      getTeam={getTeam}
                      refereesText={getReferees(game)}
                      badges={
                        <>
                          {isAmistoso && amistosoBadge}
                          {stageBadge(game)}
                        </>
                      }
                      notice={isAmistoso ? amistosoNotice("🤝 Amistoso - No contó para estadísticas") : null}
                      footer={
                        <button
                          onClick={() => shareGame(game)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Download className="h-4 w-4" />
                          Descargar Resultado
                        </button>
                      }
                    />
                  </StaggerItem>
                )
              })}
            </Stagger>
          ) : (
            <EmptyState
              icon={<Trophy className="h-10 w-10" />}
              title="No hay partidos finalizados"
              text="Los resultados de los partidos aparecerán aquí una vez que finalicen."
            />
          )}
        </section>
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

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Reveal className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-600">{text}</p>
    </Reveal>
  )
}

export default function GamesPage() {
  return (
    <Suspense fallback={<BrandLoader label="Cargando partidos…" />}>
      <GamesPageContent />
    </Suspense>
  )
}
