"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  ArrowRight,
  Castle as Whistle,
  Search,
  Filter,
  Share2,
  Download,
  Info,
} from "lucide-react"

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
    <div className="text-sm font-bold text-red-600 mt-1 bg-red-100 px-3 py-1 rounded-full border border-red-200">
      {timeString}
    </div>
  );
}
// ----------------------------------------------------


export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [matchTypeFilter, setMatchTypeFilter] = useState("")
  const gameCardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const [gamesRes, teamsRes] = await Promise.all([fetch("/api/games"), fetch("/api/teams")])
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
  }, [])

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
      "femenil-cooper": "Femenil Cooper",
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

      return matchesSearch && matchesCategory && matchesStatus && matchesMatchType
    })
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="text-white text-xl">Cargando partidos...</div>
      </div>
    )
  }
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    )
  }

  const normalizedStatus = (s: string) => (s === "en vivo" || s === "en_vivo" ? "en_vivo" : s)

  const liveGames = filteredGames(games.filter((g) => normalizedStatus(g.status) === "en_vivo"))
  const upcomingGames = filteredGames(
    games
      .filter((g) => normalizedStatus(g.status) === "programado")
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime()),
  )
  const finishedGames = filteredGames(
    games
      .filter((g) => normalizedStatus(g.status) === "finalizado")
      .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()),
  )

  const renderTeam = (name: string, isHome = true) => {
    const logo = getTeamLogo(name)
    const colors = getTeamColors(name)

    return (
      <div className="flex flex-col items-center text-center flex-1">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 overflow-hidden border-2 border-white/20 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2})` }}
        >
          {logo ? (
            <img
              src={logo || "/placeholder.svg"}
              alt={`Logo de ${name}`}
              className="h-full w-full object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const parent = target.parentElement
                if (parent) {
                  target.style.display = "none"
                  parent.innerHTML = `<span class="text-xl font-bold">${name.charAt(0)}</span>`
                }
              }}
            />
          ) : (
            name.charAt(0)
          )}
        </div>
        <span className="font-semibold text-sm text-white text-center leading-tight max-w-[80px]">{name}</span>
      </div>
    )
  }

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
            🏈 Liga Flag Durango 2026
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
              ${new Date(game.game_date).toLocaleDateString("es-ES", {
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

  return (
    <div className="min-h-screen bg-white">
      <section
        className="relative py-20 overflow-hidden"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block bg-green-400/95 backdrop-blur-sm text-gray-900 px-6 py-2 rounded-full font-bold mb-6">
              {"🏈 Calendario de Partidos - Liga Flag Durango"}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Partidos
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                2026
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Sigue todos los partidos de la temporada actual.
              <span className="block mt-2 text-yellow-300 font-semibold">¡No te pierdas ningún juego!</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold"
                onClick={() => (window.location.href = "/equipos")}
              >
                <Users className="w-5 h-5 mr-2" />
                Ver Equipos
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-gray-900 bg-transparent"
                onClick={() => (window.location.href = "/")}
              >
                Inicio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar equipos, venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                <option value="varonil-libre">Varonil Libre</option>
                <option value="varonil-gold">Varonil Gold</option>
                <option value="varonil-silver">Varonil Silver</option>
                <option value="femenil-gold">Femenil Gold</option>
                <option value="femenil-silver">Femenil Silver</option>
                <option value="femenil-cooper">Femenil Cooper</option>
                <option value="mixto-gold">Mixto Gold</option>
                <option value="mixto-silver">Mixto Silver</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="programado">Programados</option>
                <option value="en_vivo">En Vivo</option>
                <option value="finalizado">Finalizados</option>
              </select>
              <select
                value={matchTypeFilter}
                onChange={(e) => setMatchTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="jornada">Jornada</option>
                <option value="amistoso">Amistoso</option>
                <option value="playoff">Playoff</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 lg:p-6">
        {liveGames.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>🔴 PARTIDOS EN VIVO
              </h2>
              <p className="text-gray-600 text-lg">Partidos que se están jugando ahora mismo</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {liveGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <Card
                    key={game.id}
                    ref={(el) => (gameCardRefs.current[game.id] = el)}
                    className="border-2 border-red-500 shadow-2xl bg-red-500/10 backdrop-blur-sm hover:bg-red-500/20 transition-all duration-300"
                  >
                    <CardContent className="p-6 lg:p-8">
                      {isAmistoso && (
                        <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                          <div className="flex items-center gap-2 text-orange-800">
                            <Info className="w-5 h-5" />
                            <span className="font-semibold text-sm">
                              🤝 Partido Amistoso - No cuenta para estadísticas oficiales
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-8 flex-1">
                          <div className="text-center min-w-[80px]">
                            <p className="text-sm text-gray-600">
                              {new Date(game.game_date).toLocaleDateString("es-ES")}
                            </p>
                            <p className="font-semibold text-gray-900">{game.game_time}</p>
                          </div>

                          <div className="flex items-center justify-center gap-4 flex-1 max-w-2xl mx-auto">
                            {renderTeam(game.home_team, true)}

                            <div className="flex flex-col items-center justify-center min-w-[120px]">
                              <div className="text-4xl font-bold text-red-500 animate-pulse text-center">
                                {game.home_score ?? 0} - {game.away_score ?? 0}
                              </div>
                              {/* AQUÍ REEMPLAZAMOS EL TEXTO ESTÁTICO POR EL RELOJ EN VIVO */}
                              <LiveTimerDisplay game={game} />
                            </div>

                            {renderTeam(game.away_team, false)}
                          </div>

                          <div className="text-sm text-gray-600 min-w-[150px]">
                            <p className="font-medium flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {game.venue}
                            </p>
                            <p className="text-gray-500">{game.field}</p>
                            <p className="text-gray-500 flex items-center mt-1">
                              <Whistle className="w-4 h-4 mr-1" />
                              {getReferees(game)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Badge className={`${getCategoryColor(game.category)} text-white`}>
                              {getCategoryLabel(game.category)}
                            </Badge>
                            <Badge className="bg-red-500 text-white animate-pulse">🔴 EN VIVO</Badge>
                            {isAmistoso && <Badge className="bg-orange-500 text-white">🤝 Amistoso</Badge>}
                            {game.stage && game.stage !== "regular" && (
                              <Badge variant="secondary">{getStageLabel(game.stage)}</Badge>
                            )}
                            {game.jornada && <Badge className="bg-blue-600">J{game.jornada}</Badge>}
                          </div>
                          <Button
                            onClick={() => shareGame(game)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
                            size="sm"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 mr-3 text-blue-400" />
              Próximos Partidos
            </h2>
            <p className="text-gray-600 text-lg">Partidos programados para los próximos días</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingGames.length > 0 ? (
              upcomingGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <Card
                    key={game.id}
                    ref={(el) => (gameCardRefs.current[game.id] = el)}
                    className="shadow-xl hover:shadow-2xl transition-all duration-300 bg-white border-gray-200 hover:bg-gray-50 transform hover:scale-105"
                  >
                    <CardHeader className="p-0">
                      <div
                        className={`relative h-40 flex items-center justify-center rounded-t-lg ${isAmistoso ? "bg-gradient-to-br from-gray-400/20 to-gray-500/20" : "bg-gradient-to-br from-blue-500/20 to-purple-500/20"}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center gap-6 p-4">
                          {renderTeam(game.home_team)}
                          <div className="text-2xl font-bold text-gray-900">VS</div>
                          {renderTeam(game.away_team)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {isAmistoso && (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-1 text-orange-800 text-xs">
                            <Info className="w-3 h-3" />
                            <span className="font-medium">🤝 Amistoso - No cuenta para estadísticas</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge className={`${getCategoryColor(game.category)} text-white`}>
                          {getCategoryLabel(game.category)}
                        </Badge>
                        <Badge className={isAmistoso ? "bg-orange-500" : "bg-blue-600"}>
                          {isAmistoso ? "🤝 Amistoso" : "Programado"}
                        </Badge>
                        {game.stage && game.stage !== "regular" && (
                          <Badge variant="outline">{getStageLabel(game.stage)}</Badge>
                        )}
                      </div>
                      <div className="text-center text-gray-600 space-y-2">
                        <p className="flex items-center justify-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {new Date(game.game_date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="flex items-center justify-center text-sm">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          {game.game_time}
                        </p>
                        <p className="flex items-center justify-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          {game.venue} - {game.field}
                        </p>
                        <p className="flex items-center justify-center text-sm">
                          <Whistle className="w-4 h-4 mr-2 text-gray-500" />
                          Árbitros: {getReferees(game)}
                        </p>
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={() => shareGame(game)}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
                          size="sm"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Compartir Partido
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full">
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay partidos programados</h3>
                    <p className="text-gray-600">Los próximos partidos aparecerán aquí una vez que sean programados.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Trophy className="w-8 h-8 mr-3 text-green-400" />
              Partidos Finalizados
            </h2>
            <p className="text-gray-600 text-lg">Resultados de los partidos más recientes</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finishedGames.length > 0 ? (
              finishedGames.map((game) => {
                const isAmistoso = game.match_type === "amistoso"
                return (
                  <Card
                    key={game.id}
                    ref={(el) => (gameCardRefs.current[game.id] = el)}
                    className="shadow-xl hover:shadow-2xl transition-all duration-300 bg-white border-gray-200 hover:bg-gray-50 transform hover:scale-105"
                  >
                    <CardHeader className="p-0">
                      <div
                        className={`relative h-40 flex items-center justify-center rounded-t-lg ${isAmistoso ? "bg-gradient-to-br from-gray-400/20 to-gray-500/20" : "bg-gradient-to-br from-green-500/20 to-blue-500/20"}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center gap-6 p-4">
                          {renderTeam(game.home_team)}
                          <div className="text-3xl font-bold text-gray-900">
                            {game.home_score ?? 0} - {game.away_score ?? 0}
                          </div>
                          {renderTeam(game.away_team)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {isAmistoso && (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-1 text-orange-800 text-xs">
                            <Info className="w-3 h-3" />
                            <span className="font-medium">🤝 Amistoso - No contó para estadísticas</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge className={`${getCategoryColor(game.category)} text-white`}>
                          {getCategoryLabel(game.category)}
                        </Badge>
                        <Badge className={isAmistoso ? "bg-orange-500" : "bg-green-600"}>
                          {isAmistoso ? "🤝 Amistoso" : "Finalizado"}
                        </Badge>
                        {game.stage && game.stage !== "regular" && (
                          <Badge variant="outline">{getStageLabel(game.stage)}</Badge>
                        )}
                      </div>
                      <div className="text-center text-gray-600 space-y-2">
                        <p className="flex items-center justify-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {new Date(game.game_date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="flex items-center justify-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          {game.venue} - {game.field}
                        </p>
                        <p className="flex items-center justify-center text-sm">
                          <Whistle className="w-4 h-4 mr-2 text-gray-500" />
                          Árbitros: {getReferees(game)}
                        </p>
                        {game.mvp && !isAmistoso && (
                          <p className="flex items-center justify-center text-sm text-yellow-600">
                            <Trophy className="w-4 h-4 mr-2" /> MVP: {game.mvp}
                          </p>
                        )}
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={() => shareGame(game)}
                          className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Resultado
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full">
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay partidos finalizados</h3>
                    <p className="text-gray-600">
                      Los resultados de los partidos aparecerán aquí una vez que finalicen.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="py-16" style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Quieres participar?</h2>
          <p className="text-white/90 text-lg mb-8">Únete a la Liga Flag Durango y forma parte de la acción</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold"
              onClick={() => (window.location.href = "/register-team")}
            >
              <Users className="w-5 h-5 mr-2" />
              Registrar Equipo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-gray-900 bg-transparent"
              onClick={() => (window.location.href = "/register-coach")}
            >
              Registrar Coach
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}