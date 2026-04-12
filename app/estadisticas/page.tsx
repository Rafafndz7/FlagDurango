"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Users, TrendingUp, Award, Star, BarChart3 } from "lucide-react"

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

export default function EstadisticasPage() {
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
    { value: "femenil-cooper", label: "Femenil Cooper" },
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
  }, [])

  useEffect(() => {
    if (viewType === "teams") {
      fetchStats()
    } else if (viewType === "mvps") {
      fetchMvpStats()
    }
  }, [selectedCategory, viewType])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stats?category=${selectedCategory}&season=2025`)
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
      const response = await fetch(`/api/mvps/weekly`)
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
      const categoryParam = selectedCategory !== "all" ? `?category=${selectedCategory}` : ""
      const response = await fetch(`/api/mvps/stats${categoryParam}`)
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
      const res = await fetch(`/api/games`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative py-20 overflow-hidden"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block bg-green-400/95 backdrop-blur-sm text-gray-900 px-6 py-2 rounded-full font-bold mb-6">
              {"🏈 Estadísticas - Liga Flag Durango"}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Estadísticas
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                2026
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Tabla de posiciones y estadísticas completas de todos los equipos.
              <span className="block mt-2 text-yellow-300 font-semibold">¡Sigue el rendimiento de tu equipo!</span>
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Estadísticas</h1>
          <p className="text-gray-600">
            {viewType === "teams" ? "Tabla de posiciones y estadísticas de equipos" : "Ranking de jugadores MVP"}
          </p>
        </div>

        {/* Toggle de vista */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewType("teams")}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                viewType === "teams"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas de Equipos
            </button>
            <button
              onClick={() => setViewType("mvps")}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                viewType === "mvps"
                  ? "bg-yellow-600 text-white font-semibold"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              <Star className="w-4 h-4" />
              MVPs
            </button>
          </div>
        </div>

        {/* Filtro de categoría */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === category.value
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {viewType === "teams" && (
          <>
            {/* MVP de la Jornada */}
            <div className="mb-8">
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    MVP de la Jornada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCategory !== "all" && filteredLatestMvp ? (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={
                            filteredLatestMvp.players?.photo_url ||
                            "/placeholder.svg?height=128&width=128&query=foto-de-jugador-mvp" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg"
                          }
                          alt={filteredLatestMvp.players?.name || "MVP"}
                          className="object-cover w-16 h-16"
                        />
                      </div>
                      <div>
                        <div className="text-gray-900 text-lg font-semibold">
                          {filteredLatestMvp.players?.name || "—"}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {filteredLatestMvp.players?.teams?.name || "Equipo"}{" "}
                          {filteredLatestMvp.week_number ? `• Semana ${filteredLatestMvp.week_number}` : ""}
                        </div>
                        <Badge className={`${getCategoryColor(filteredLatestMvp.category)} text-white mt-2`}>
                          {filteredLatestMvp.category.replace("-", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ) : selectedCategory === "all" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {latestMvpsAnyCategory.map((mvp) => (
                        <div key={mvp.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                            <img
                              src={
                                mvp.players?.photo_url ||
                                "/placeholder.svg?height=128&width=128&query=foto-de-jugador-mvp" ||
                                "/placeholder.svg" ||
                                "/placeholder.svg" ||
                                "/placeholder.svg" ||
                                "/placeholder.svg"
                              }
                              alt={mvp.players?.name || "MVP"}
                              className="object-cover w-14 h-14"
                            />
                          </div>
                          <div>
                            <div className="text-gray-900 font-semibold">{mvp.players?.name || "—"}</div>
                            <div className="text-gray-600 text-xs">
                              {mvp.players?.teams?.name || "Equipo"}{" "}
                              {mvp.week_number ? `• Semana ${mvp.week_number}` : ""}
                            </div>
                            <Badge className={`${getCategoryColor(mvp.category)} text-white mt-1`}>
                              {mvp.category.replace("-", " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {latestMvpsAnyCategory.length === 0 && (
                        <div className="text-gray-600">Aún no hay MVPs registrados.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600">Aún no hay MVP de la jornada para esta categoría.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Resumen de Equipos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Total Equipos</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.length}</div>
                  <p className="text-xs text-gray-600">En la categoría seleccionada</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Partidos Jugados</CardTitle>
                  <Trophy className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalGamesDistinct}</div>
                  <p className="text-xs text-gray-600">Total de partidos</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Puntos Totales</CardTitle>
                  <Target className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.reduce((sum, team) => sum + team.points_for, 0)}
                  </div>
                  <p className="text-xs text-gray-600">Puntos anotados</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Promedio por Partido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalGamesDistinct > 0
                      ? (stats.reduce((sum, t) => sum + t.points_for, 0) / totalGamesDistinct).toFixed(1)
                      : "0.0"}
                  </div>
                  <p className="text-xs text-gray-600">Puntos por partido</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de Equipos */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Tabla de Posiciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-gray-900 font-semibold">Pos</th>
                        <th className="text-left py-3 px-2 text-gray-900 font-semibold">Equipo</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">PJ</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">G</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">E</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">P</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">PF</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">PC</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">DP</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">Pts</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((team) => (
                        <tr key={team.team_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <span className={`font-bold text-lg ${getPositionColor(team.position)}`}>
                              {team.position}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs overflow-hidden"
                                style={{
                                  background: `linear-gradient(135deg, ${team.team_color1}, ${team.team_color2})`,
                                }}
                              >
                                {team.team_logo ? (
                                  <img
                                    src={team.team_logo || "/placeholder.svg?height=32&width=32&query=logo-equipo"}
                                    alt={team.team_name}
                                    className="rounded-full object-cover w-8 h-8"
                                  />
                                ) : (
                                  team.team_name.charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="text-gray-900 font-semibold">{team.team_name}</div>
                                <Badge className={`${getCategoryColor(team.team_category)} text-white text-xs`}>
                                  {team.team_category.replace("-", " ").toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-900">{team.games_played}</td>
                          <td className="text-center py-3 px-2 text-green-600 font-semibold">{team.games_won}</td>
                          <td className="text-center py-3 px-2 text-yellow-600 font-semibold">{team.games_tied}</td>
                          <td className="text-center py-3 px-2 text-red-600 font-semibold">{team.games_lost}</td>
                          <td className="text-center py-3 px-2 text-gray-900">{team.points_for}</td>
                          <td className="text-center py-3 px-2 text-gray-900">{team.points_against}</td>
                          <td className="text-center py-3 px-2">
                            <span
                              className={`font-semibold ${
                                team.point_difference > 0
                                  ? "text-green-600"
                                  : team.point_difference < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {team.point_difference > 0 ? "+" : ""}
                              {team.point_difference}
                            </span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="font-bold text-blue-600 text-lg">{team.points}</span>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-900">{team.win_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stats.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay estadísticas disponibles para esta categoría.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {viewType === "mvps" && (
          <>
            {/* Resumen de MVPs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Total MVPs</CardTitle>
                  <Star className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {mvpStats.reduce((sum, p) => sum + p.weighted_mvp_count, 0)}
                  </div>
                  <p className="text-xs text-gray-600">Puntos MVP totales</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Jugadores MVP</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{mvpStats.length}</div>
                  <p className="text-xs text-gray-600">Jugadores únicos</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">MVPs Semanales</CardTitle>
                  <Trophy className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {mvpStats.reduce((sum, p) => sum + p.weekly_mvps, 0)}
                  </div>
                  <p className="text-xs text-gray-600">Valen 2 puntos c/u</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">MVPs de Juego</CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {mvpStats.reduce((sum, p) => sum + p.game_mvps, 0)}
                  </div>
                  <p className="text-xs text-gray-600">Valen 1 punto c/u</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de MVPs */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Ranking de Jugadores MVP</CardTitle>
                <p className="text-sm text-gray-600">Ordenados por puntos MVP (Semanal = 2pts, Juego = 1pt)</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-gray-900 font-semibold">Pos</th>
                        <th className="text-left py-3 px-2 text-gray-900 font-semibold">Jugador</th>
                        <th className="text-left py-3 px-2 text-gray-900 font-semibold">Equipo</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">Puntos MVP</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">Semanales</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">De Juego</th>
                        <th className="text-center py-3 px-2 text-gray-900 font-semibold">Total MVPs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mvpStats.map((player, index) => (
                        <tr key={player.player_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <span className={`font-bold text-lg ${getPositionColor(index + 1)}`}>{index + 1}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                <img
                                  src={player.photo_url || "/placeholder.svg?height=40&width=40&query=foto-jugador"}
                                  alt={player.player_name}
                                  className="object-cover w-10 h-10"
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                                />
                              </div>
                              <div className="text-gray-900 font-semibold">{player.player_name}</div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs overflow-hidden"
                                style={{
                                  background: `linear-gradient(135deg, ${player.team_color1 || "#3B82F6"}, ${player.team_color2 || "#1E40AF"})`,
                                }}
                              >
                                {player.team_logo ? (
                                  <img
                                    src={player.team_logo || "/placeholder.svg?height=24&width=24&query=logo-equipo"}
                                    alt={player.team_name || "Equipo"}
                                    className="rounded-full object-cover w-6 h-6"
                                  />
                                ) : (
                                  (player.team_name || "E").charAt(0)
                                )}
                              </div>
                              <span className="text-gray-900 text-sm">{player.team_name || "Sin equipo"}</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="font-bold text-purple-600 text-lg">{player.weighted_mvp_count}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="font-semibold text-yellow-600">{player.weekly_mvps}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="font-semibold text-green-600">{player.game_mvps}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="font-bold text-blue-600">{player.mvp_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mvpStats.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay estadísticas de MVP disponibles para esta categoría.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Footer CTA */}
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
