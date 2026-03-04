"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Users, TrendingUp, Award, Star, BarChart3, Shield, ChevronDown, ChevronUp } from "lucide-react"

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

interface PlayerRankInfo {
  id: number
  name: string
  jersey_number: number
  position?: string
  photo_url?: string
  team_id: number
  teams?: { id: number; name: string; logo_url?: string; category?: string }
}

interface PlayerGameStat {
  player_id: number
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
  players?: PlayerRankInfo
}

interface AggregatedPlayer {
  player: PlayerRankInfo
  games: number
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
  yardas_totales: number
  [key: string]: unknown
}

const OFFENSE_COLS: { key: string; label: string; short: string }[] = [
  { key: "touchdowns_totales", label: "TDs Totales", short: "TD" },
  { key: "puntos_totales", label: "Puntos", short: "PTS" },
  { key: "yardas_totales", label: "Yardas Totales", short: "YDS" },
  { key: "pases_completos", label: "Pases Completos", short: "PC" },
  { key: "pases_intentados", label: "Pases Intentados", short: "PI" },
  { key: "yardas_pase", label: "Yardas Pase", short: "YP" },
  { key: "touchdowns_pase", label: "TD Pase", short: "TDP" },
  { key: "recepciones", label: "Recepciones", short: "REC" },
  { key: "yardas_recepcion", label: "Yardas Recepcion", short: "YR" },
  { key: "touchdowns_recepcion", label: "TD Recepcion", short: "TDR" },
  { key: "carreras", label: "Carreras", short: "CAR" },
  { key: "yardas_carrera", label: "Yardas Carrera", short: "YC" },
  { key: "touchdowns_carrera", label: "TD Carrera", short: "TDC" },
]

const DEFENSE_COLS: { key: string; label: string; short: string }[] = [
  { key: "intercepciones", label: "Intercepciones", short: "INT" },
  { key: "sacks", label: "Sacks", short: "SCK" },
  { key: "banderas_jaladas", label: "Banderas Jaladas", short: "BJ" },
  { key: "pases_defendidos", label: "Pases Defendidos", short: "PD" },
  { key: "touchdowns_intercepcion", label: "TD Intercepcion", short: "TDI" },
  { key: "yardas_intercepcion", label: "Yardas INT", short: "YINT" },
]

function normalizeCategory(v: string) {
  return (v || "").toLowerCase().replace(/_/g, "-").trim()
}

export default function EstadisticasPage() {
  const [stats, setStats] = useState<TeamStats[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewType, setViewType] = useState<"teams" | "mvps" | "ranking">("teams")
  const [loading, setLoading] = useState(true)
  const [mvps, setMvps] = useState<WeeklyMVP[]>([])
  const [mvpStats, setMvpStats] = useState<MVPStats[]>([])
  const [games, setGames] = useState<GameLite[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerGameStat[]>([])
  const [rankingView, setRankingView] = useState<"offense" | "defense">("offense")
  const [rankSortKey, setRankSortKey] = useState("touchdowns_totales")
  const [rankSortDir, setRankSortDir] = useState<"asc" | "desc">("desc")
  const [enabledCategories, setEnabledCategories] = useState<string[]>([])

  const ALL_CATEGORIES: { value: string; label: string }[] = [
    { value: "varonil-libre", label: "Varonil Libre" },
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
    // Cargar categorias habilitadas desde system_config
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
    } else if (viewType === "ranking") {
      fetchPlayerStats()
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

  const fetchPlayerStats = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/player-stats?ranking=true")
      const json = await res.json()
      if (json.success) setPlayerStats(json.data || [])
    } catch (e) {
      console.error("Error fetching player stats:", e)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate player stats
  const aggregatedPlayers: AggregatedPlayer[] = useMemo(() => {
    const map: Record<number, AggregatedPlayer> = {}
    for (const stat of playerStats) {
      const pid = stat.player_id
      if (!stat.players) continue
      // Filter by category if selected
      if (selectedCategory !== "all" && stat.players.teams?.category) {
        if (normalizeCategory(stat.players.teams.category) !== normalizeCategory(selectedCategory)) continue
      }
      if (!map[pid]) {
        map[pid] = {
          player: stat.players,
          games: 0, pases_completos: 0, pases_intentados: 0, yardas_pase: 0,
          touchdowns_pase: 0, intercepciones_lanzadas: 0, carreras: 0,
          yardas_carrera: 0, touchdowns_carrera: 0, recepciones: 0,
          yardas_recepcion: 0, touchdowns_recepcion: 0, puntos_extra: 0,
          sacks: 0, intercepciones: 0, yardas_intercepcion: 0,
          touchdowns_intercepcion: 0, pases_defendidos: 0, banderas_jaladas: 0,
          touchdowns_totales: 0, puntos_totales: 0, yardas_totales: 0,
        }
      }
      const p = map[pid]
      p.games += 1
      p.pases_completos += stat.pases_completos || 0
      p.pases_intentados += stat.pases_intentados || 0
      p.yardas_pase += stat.yardas_pase || 0
      p.touchdowns_pase += stat.touchdowns_pase || 0
      p.intercepciones_lanzadas += stat.intercepciones_lanzadas || 0
      p.carreras += stat.carreras || 0
      p.yardas_carrera += stat.yardas_carrera || 0
      p.touchdowns_carrera += stat.touchdowns_carrera || 0
      p.recepciones += stat.recepciones || 0
      p.yardas_recepcion += stat.yardas_recepcion || 0
      p.touchdowns_recepcion += stat.touchdowns_recepcion || 0
      p.puntos_extra += stat.puntos_extra || 0
      p.sacks += stat.sacks || 0
      p.intercepciones += stat.intercepciones || 0
      p.yardas_intercepcion += stat.yardas_intercepcion || 0
      p.touchdowns_intercepcion += stat.touchdowns_intercepcion || 0
      p.pases_defendidos += stat.pases_defendidos || 0
      p.banderas_jaladas += stat.banderas_jaladas || 0
      p.touchdowns_totales += stat.touchdowns_totales || 0
      p.puntos_totales += stat.puntos_totales || 0
      p.yardas_totales += (stat.yardas_pase || 0) + (stat.yardas_carrera || 0) + (stat.yardas_recepcion || 0)
    }
    return Object.values(map)
  }, [playerStats, selectedCategory])

  const sortedPlayers = useMemo(() => {
    return [...aggregatedPlayers].sort((a, b) => {
      const av = (a[rankSortKey] as number) || 0
      const bv = (b[rankSortKey] as number) || 0
      return rankSortDir === "desc" ? bv - av : av - bv
    })
  }, [aggregatedPlayers, rankSortKey, rankSortDir])

  const handleRankSort = (key: string) => {
    if (rankSortKey === key) setRankSortDir(rankSortDir === "desc" ? "asc" : "desc")
    else { setRankSortKey(key); setRankSortDir("desc") }
  }

  const rankColumns = rankingView === "offense" ? OFFENSE_COLS : DEFENSE_COLS

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
      {/* Hero Section - SIN overlay oscuro */}
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
            {viewType === "teams" ? "Tabla de posiciones y estadisticas de equipos" : viewType === "mvps" ? "Ranking de jugadores MVP" : "Estadisticas individuales de jugadores - Ataque y Defensa"}
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
            <button
              onClick={() => setViewType("ranking")}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                viewType === "ranking"
                  ? "bg-green-600 text-white font-semibold"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Ranking Individual
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

        {viewType === "ranking" && (
          <>
            {/* Ranking toggle ataque/defensa */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => { setRankingView("offense"); setRankSortKey("touchdowns_totales"); setRankSortDir("desc") }}
                className={rankingView === "offense" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"}
              >
                <Target className="w-4 h-4 mr-2" />
                Ataque
              </Button>
              <Button
                onClick={() => { setRankingView("defense"); setRankSortKey("intercepciones"); setRankSortDir("desc") }}
                className={rankingView === "defense" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"}
              >
                <Shield className="w-4 h-4 mr-2" />
                Defensa
              </Button>
              <span className="self-center text-sm text-gray-500 ml-2">{sortedPlayers.length} jugadores</span>
            </div>

            {/* Top 3 */}
            {sortedPlayers.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {sortedPlayers.slice(0, 3).map((item, idx) => {
                  const colors = [
                    "from-yellow-400 to-yellow-600",
                    "from-gray-300 to-gray-500",
                    "from-orange-400 to-orange-600",
                  ]
                  const mainStat = (item[rankSortKey] as number) || 0
                  const col = rankColumns.find((c) => c.key === rankSortKey)

                  return (
                    <Card key={item.player.id} className="bg-white border-gray-200 overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${colors[idx]}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.player.photo_url && (
                                <img src={item.player.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                              )}
                              <h3 className="font-bold text-gray-900 truncate">{item.player.name}</h3>
                              <Badge variant="outline" className="text-xs">#{item.player.jersey_number}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {item.player.teams?.logo_url && (
                                <img src={item.player.teams.logo_url} alt="" className="w-5 h-5 rounded object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                              )}
                              <span className="text-sm text-gray-500">{item.player.teams?.name}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-gray-900">{mainStat}</p>
                            <p className="text-xs text-gray-500">{col?.label}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                          <div className="text-center">
                            <p className="font-bold text-gray-900">{item.touchdowns_totales}</p>
                            <p className="text-xs text-gray-500">TDs</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-gray-900">{item.yardas_totales}</p>
                            <p className="text-xs text-gray-500">Yardas</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-gray-900">{item.games}</p>
                            <p className="text-xs text-gray-500">Partidos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Full Table */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                  {rankingView === "offense" ? (
                    <><Target className="w-5 h-5 text-red-500" /> Ranking de Ataque</>
                  ) : (
                    <><Shield className="w-5 h-5 text-blue-500" /> Ranking de Defensa</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">#</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[180px]">Jugador</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-500 text-xs">PJ</th>
                        {rankColumns.map((col) => (
                          <th
                            key={col.key}
                            onClick={() => handleRankSort(col.key)}
                            className="text-center py-3 px-2 font-semibold text-gray-500 text-xs cursor-pointer hover:text-gray-900 transition-colors whitespace-nowrap select-none"
                            title={col.label}
                          >
                            <span className="flex items-center justify-center gap-1">
                              {col.short}
                              {rankSortKey === col.key && (
                                rankSortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map((item, idx) => (
                        <tr key={item.player.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx < 3 ? "bg-yellow-50/30" : ""}`}>
                          <td className="py-2 px-3 font-bold text-gray-900">
                            {idx < 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                                idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-orange-500"
                              }`}>
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-gray-500">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {item.player.photo_url ? (
                                <img src={item.player.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                  {item.player.jersey_number}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate text-sm">{item.player.name}</p>
                                <p className="text-xs text-gray-500 truncate">{item.player.teams?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-2 px-2 text-gray-600">{item.games}</td>
                          {rankColumns.map((col) => {
                            const val = (item[col.key] as number) || 0
                            return (
                              <td key={col.key} className={`text-center py-2 px-2 ${rankSortKey === col.key ? "font-bold text-gray-900 bg-yellow-50/50" : "text-gray-600"}`}>
                                {val}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sortedPlayers.length === 0 && (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No hay estadisticas individuales registradas aun</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {viewType === "teams" ? (
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
        ) : (
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
