"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2, RefreshCw, Star, Trophy } from "lucide-react"
import { getCategoryColor, getCategoryLabel } from "@/lib/categories"
import { MVP_WEIGHTS } from "@/lib/mvp-suggestions"

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

interface GameSuggestion {
  game: {
    id: number
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    jornada: number | null
    category: string | null
  }
  candidates: Candidate[]
  assigned_player_id: number | null
}

interface WeekSuggestion {
  jornada: number
  category: string
  candidates: Candidate[]
  assigned_player_id: number | null
}

const RANK_STYLES = ["bg-yellow-500 text-white", "bg-gray-400 text-white", "bg-amber-700 text-white"]

function CandidateRow({
  candidate,
  index,
  assignedId,
  busy,
  onAssign,
}: {
  candidate: Candidate
  index: number
  assignedId: number | null
  busy: boolean
  onAssign: () => void
}) {
  const isAssigned = assignedId === candidate.player_id
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-2 ${isAssigned ? "border-green-400 bg-green-50" : "border-gray-200"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[index] || "bg-gray-200"}`}>
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {candidate.jersey_number != null ? `#${candidate.jersey_number} ` : ""}
          {candidate.name}
        </p>
        <p className="truncate text-xs text-gray-600">
          {candidate.team_name}
          {candidate.games && candidate.games > 1 ? ` · ${candidate.games} partidos` : ""}
          {candidate.detail ? ` · ${candidate.detail}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold text-gray-900">{candidate.score} pts</span>
      {isAssigned ? (
        <Badge className="shrink-0 bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Asignado
        </Badge>
      ) : (
        assignedId == null && (
          <Button size="sm" variant="outline" className="shrink-0" disabled={busy} onClick={onAssign}>
            Asignar
          </Button>
        )
      )}
    </div>
  )
}

export default function AdminMvpSuggestions() {
  const [games, setGames] = useState<GameSuggestion[]>([])
  const [weeks, setWeeks] = useState<WeekSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [jornada, setJornada] = useState<string>("")
  const [category, setCategory] = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/mvps/suggestions", { cache: "no-store" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Error cargando sugeridos")
      setGames(data.games || [])
      setWeeks(data.weeks || [])
      setJornada((current) => current || String(data.weeks?.[0]?.jornada ?? data.games?.[0]?.game?.jornada ?? ""))
    } catch (e: any) {
      setMessage({ type: "error", text: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const jornadas = useMemo(
    () =>
      Array.from(new Set([...weeks.map((w) => w.jornada), ...games.map((g) => Number(g.game.jornada)).filter(Boolean)])).sort(
        (a, b) => b - a,
      ),
    [weeks, games],
  )
  const categories = useMemo(
    () => Array.from(new Set(games.map((g) => g.game.category).filter(Boolean))) as string[],
    [games],
  )

  const matches = (j: number | null, c: string | null) =>
    (!jornada || String(j) === jornada) && (category === "all" || c === category)
  const visibleWeeks = weeks.filter((w) => matches(w.jornada, w.category))
  const visibleGames = games.filter((g) => matches(g.game.jornada, g.game.category))

  const assign = async (body: Record<string, unknown>, label: string) => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/mvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "No se pudo asignar")
      setMessage({ type: "ok", text: label })
      await load()
    } catch (e: any) {
      setMessage({ type: "error", text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Star className="h-5 w-5 text-yellow-500" />
            MVPs sugeridos por estadísticas
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            TD {MVP_WEIGHTS.td_anotado} · TD pase {MVP_WEIGHTS.td_pase} · INT {MVP_WEIGHTS.intercepcion} · Sack {MVP_WEIGHTS.sack} · Pase
            defendido {MVP_WEIGHTS.pase_defendido} · Pase completo, recepción y bandera {MVP_WEIGHTS.pase_completo} · INT lanzada{" "}
            {MVP_WEIGHTS.intercepcion_lanzada} · 1 por cada {MVP_WEIGHTS.yardas_por_punto} yardas · +{MVP_WEIGHTS.victoria} si su equipo
            ganó
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded border px-2 text-sm" value={jornada} onChange={(e) => setJornada(e.target.value)}>
            <option value="">Todas las jornadas</option>
            {jornadas.map((j) => (
              <option key={j} value={String(j)}>
                Jornada {j}
              </option>
            ))}
          </select>
          <select className="h-9 rounded border px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {getCategoryLabel(c)}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
          </div>
        )}

        {loading && games.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculando sugeridos…
          </div>
        ) : games.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Todavía no hay estadísticas de jugadores capturadas en esta temporada.
          </p>
        ) : (
          <>
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <Trophy className="h-4 w-4 text-yellow-600" />
                Jugador de la semana
              </h3>
              {visibleWeeks.length === 0 ? (
                <p className="text-sm text-gray-500">Sin estadísticas para este filtro.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleWeeks.map((w) => (
                    <div key={`${w.jornada}-${w.category}`} className="space-y-2 rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getCategoryColor(w.category)} text-white`}>{getCategoryLabel(w.category)}</Badge>
                        <Badge variant="outline">J{w.jornada}</Badge>
                      </div>
                      {w.candidates.map((c, i) => (
                        <CandidateRow
                          key={c.player_id}
                          candidate={c}
                          index={i}
                          assignedId={w.assigned_player_id}
                          busy={busy}
                          onAssign={() =>
                            assign(
                              {
                                player_id: c.player_id,
                                mvp_type: "weekly",
                                category: w.category,
                                week_number: w.jornada,
                                notes: `Jugador de la semana J${w.jornada} · ${c.score} pts`,
                              },
                              `${c.name} es el jugador de la semana J${w.jornada} en ${getCategoryLabel(w.category)}`,
                            )
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <Star className="h-4 w-4 text-green-600" />
                MVP de cada partido
              </h3>
              {visibleGames.length === 0 ? (
                <p className="text-sm text-gray-500">Sin partidos con estadísticas para este filtro.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleGames.map(({ game, candidates, assigned_player_id }) => (
                    <div key={game.id} className="space-y-2 rounded-xl border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {game.home_team} {game.home_score ?? "-"} – {game.away_score ?? "-"} {game.away_team}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getCategoryLabel(game.category)}
                          {game.jornada != null ? ` · J${game.jornada}` : ""}
                        </p>
                      </div>
                      {candidates.map((c, i) => (
                        <CandidateRow
                          key={c.player_id}
                          candidate={c}
                          index={i}
                          assignedId={assigned_player_id}
                          busy={busy}
                          onAssign={() =>
                            assign(
                              {
                                player_id: c.player_id,
                                mvp_type: "game",
                                category: game.category,
                                notes: `J${game.jornada ?? "?"} · ${game.home_team} vs ${game.away_team} · partido #${game.id}`,
                              },
                              `${c.name} es el MVP de ${game.home_team} vs ${game.away_team}`,
                            )
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
