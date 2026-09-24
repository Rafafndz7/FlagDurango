"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Target, Shield, Loader2, Save, ChevronDown, ChevronUp, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string
  status: string
  category?: string
  season_id?: string
}

interface Team {
  id: number
  name: string
  category?: string
  season_id?: string
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

  if (seasonId) {
    const bySeasonCat = teams.find(
      (t) =>
        t.name === name &&
        t.season_id === seasonId &&
        (!category || t.category === category),
    )
    if (bySeasonCat) return bySeasonCat

    const bySeason = teams.find((t) => t.name === name && t.season_id === seasonId)
    if (bySeason) return bySeason
  }

  if (category) {
    const byCat = teams.find((t) => t.name === name && t.category === category)
    if (byCat) return byCat
  }

  // Último recurso: preferir el de mayor id (más reciente)
  const matches = teams.filter((t) => t.name === name)
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

const OFFENSE_FIELDS: { key: keyof typeof EMPTY_STAT; label: string; short: string }[] = [
  { key: "pases_completos", label: "Pases Completos", short: "PC" },
  { key: "pases_intentados", label: "Pases Intentados", short: "PI" },
  { key: "yardas_pase", label: "Yardas por Pase", short: "YP" },
  { key: "touchdowns_pase", label: "TD Pase", short: "TDP" },
  { key: "intercepciones_lanzadas", label: "INT Lanzadas", short: "IL" },
  { key: "carreras", label: "Carreras", short: "CAR" },
  { key: "yardas_carrera", label: "Yardas Carrera", short: "YC" },
  { key: "touchdowns_carrera", label: "TD Carrera", short: "TDC" },
  { key: "recepciones", label: "Recepciones", short: "REC" },
  { key: "yardas_recepcion", label: "Yardas Recepcion", short: "YR" },
  { key: "touchdowns_recepcion", label: "TD Recepcion", short: "TDR" },
  { key: "puntos_extra", label: "Puntos Extra", short: "XP" },
]

const DEFENSE_FIELDS: { key: keyof typeof EMPTY_STAT; label: string; short: string }[] = [
  { key: "sacks", label: "Sacks", short: "SCK" },
  { key: "intercepciones", label: "Intercepciones", short: "INT" },
  { key: "yardas_intercepcion", label: "Yardas INT", short: "YINT" },
  { key: "touchdowns_intercepcion", label: "TD Intercepcion", short: "TDI" },
  { key: "pases_defendidos", label: "Pases Defendidos", short: "PD" },
  { key: "banderas_jaladas", label: "Banderas Jaladas", short: "BJ" },
]

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
  const [statsCounts, setStatsCounts] = useState<Record<number, number>>({})
  const [statsMap, setStatsMap] = useState<Record<number, typeof EMPTY_STAT>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null)
  const [statView, setStatView] = useState<"offense" | "defense">("offense")
  const [addForm, setAddForm] = useState({
    team_id: "",
    name: "",
    jersey_number: "",
    position: "",
  })
  const [addingPlayer, setAddingPlayer] = useState(false)

  const categories = [...new Set(games.map((g) => g.category).filter(Boolean))] as string[]

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
    return games
      .filter((g) => {
        if (selectedCategory && g.category !== selectedCategory) return false
        const count = statsCounts[g.id] || 0
        if (coverageFilter === "missing") return count === 0
        if (coverageFilter === "done") return count > 0
        return true
      })
      .sort((a, b) => {
        const da = (a.game_date || "").slice(0, 10)
        const db = (b.game_date || "").slice(0, 10)
        return db.localeCompare(da)
      })
  }, [games, selectedCategory, coverageFilter, statsCounts])

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
    return {
      home: players.filter((p) => homeTeam && Number(p.team_id) === Number(homeTeam.id)),
      away: players.filter((p) => awayTeam && Number(p.team_id) === Number(awayTeam.id)),
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

  const updateStat = (playerId: number, field: string, value: number) => {
    setStatsMap((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || { ...EMPTY_STAT }),
        [field]: value,
      },
    }))
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
      setMessage({ type: "error", text: "No hay estadisticas para guardar (expande un jugador y captura datos)" })
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
        setMessage({ type: "success", text: `Estadisticas guardadas para ${data.data.length} jugadores` })
        await loadCoverage()
      } else {
        setMessage({ type: "error", text: data.message || "Error al guardar" })
      }
    } catch {
      setMessage({ type: "error", text: "Error al guardar estadisticas" })
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

  const renderPlayerStats = (player: Player) => {
    const stat = statsMap[player.id] || { ...EMPTY_STAT }
    const isExpanded = expandedPlayer === player.id
    const fields = statView === "offense" ? OFFENSE_FIELDS : DEFENSE_FIELDS

    return (
      <div key={player.id} className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
              {player.jersey_number}
            </span>
            <span className="font-medium text-gray-900">{player.name}</span>
            {player.position && <Badge variant="outline" className="text-xs">{player.position}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {stat.touchdowns_totales > 0 && (
              <Badge className="bg-green-100 text-green-700 text-xs">{stat.touchdowns_totales} TD</Badge>
            )}
            {stat.intercepciones > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">{stat.intercepciones} INT</Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant={statView === "offense" ? "default" : "outline"}
                onClick={() => setStatView("offense")}
                className={statView === "offense" ? "bg-red-600 hover:bg-red-700" : "text-gray-700 hover:text-gray-900"}
              >
                <Target className="w-3 h-3 mr-1" />
                Ataque
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statView === "defense" ? "default" : "outline"}
                onClick={() => setStatView("defense")}
                className={statView === "defense" ? "bg-blue-600 hover:bg-blue-700" : "text-gray-700 hover:text-gray-900"}
              >
                <Shield className="w-3 h-3 mr-1" />
                Defensa
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {fields.map((f) => (
                <div key={f.key} className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1 truncate" title={f.label}>
                    {f.short} - {f.label}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={stat[f.key] || 0}
                    onChange={(e) => updateStat(player.id, f.key, Number(e.target.value) || 0)}
                    className="h-8 text-sm bg-white border-gray-300 text-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const { home, away, homeTeam, awayTeam } = getGamePlayers()

  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Estadísticas rápidas por partido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge className="bg-amber-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin stats: {missingCount}
            </Badge>
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Con stats: {doneCount}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <select
              value={coverageFilter}
              onChange={(e) => {
                setCoverageFilter(e.target.value as any)
                setSelectedGame(null)
              }}
              className="p-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
            >
              <option value="missing">Solo partidos SIN estadísticas</option>
              <option value="done">Solo partidos CON estadísticas</option>
              <option value="all">Todos los partidos</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedGame(null)
              }}
              className="p-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryLabel(c)}
                </option>
              ))}
            </select>
            <select
              value={selectedGame || ""}
              onChange={(e) => setSelectedGame(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 min-w-[220px] p-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
            >
              <option value="">Seleccionar partido ({filteredGames.length})</option>
              {filteredGames.map((g) => {
                const count = statsCounts[g.id] || 0
                const mark = count > 0 ? `✓ ${count} filas` : "⚠ sin stats"
                return (
                  <option key={g.id} value={g.id}>
                    {mark} · {g.home_team} vs {g.away_team} ·{" "}
                    {(g.game_date || "").toString().slice(0, 10)} ({g.status})
                  </option>
                )
              })}
            </select>
          </div>

          {!selectedGame && coverageFilter === "missing" && filteredGames.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {filteredGames.slice(0, 40).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex justify-between gap-2"
                  onClick={() => setSelectedGame(g.id)}
                >
                  <span className="font-medium text-gray-900">
                    {g.home_team} vs {g.away_team}
                  </span>
                  <span className="text-gray-500 shrink-0">
                    {(g.game_date || "").toString().slice(0, 10)} · {getCategoryLabel(g.category)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {loading && <div className="text-center py-8 text-gray-500">Cargando estadisticas...</div>}

          {selectedGame && !loading && (
            <>
              {/* Alta rápida si falta alguien en el roster */}
              <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4" />
                  ¿Falta un jugador? Regístralo aquí y sigue capturando stats
                </h4>
                <div className="grid md:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Equipo</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={addForm.team_id}
                      onChange={(e) => setAddForm({ ...addForm, team_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {homeTeam && (
                        <option value={String(homeTeam.id)}>
                          Local: {homeTeam.name}
                        </option>
                      )}
                      {awayTeam && (
                        <option value={String(awayTeam.id)}>
                          Visita: {awayTeam.name}
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">#</Label>
                    <Input
                      value={addForm.jersey_number}
                      onChange={(e) => setAddForm({ ...addForm, jersey_number: e.target.value })}
                      placeholder="12"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <Button
                    onClick={addMissingPlayer}
                    disabled={addingPlayer}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {addingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                    Agregar
                  </Button>
                </div>
              </div>

              {home.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    {selectedGameData?.home_team} (Local) — {home.length} jugadores
                  </h3>
                  <div className="space-y-2">{home.map(renderPlayerStats)}</div>
                </div>
              )}

              {away.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    {selectedGameData?.away_team} (Visitante) — {away.length} jugadores
                  </h3>
                  <div className="space-y-2">{away.map(renderPlayerStats)}</div>
                </div>
              )}

              {home.length === 0 && away.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay jugadores en el roster de estos equipos. Usa el alta rápida de arriba.
                </div>
              )}

              {(home.length > 0 || away.length > 0) && (
                <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Estadisticas
                </Button>
              )}
            </>
          )}

          {!selectedGame && !loading && filteredGames.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {coverageFilter === "missing"
                ? "No hay partidos pendientes de estadísticas con estos filtros."
                : "No hay partidos con estos filtros."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
