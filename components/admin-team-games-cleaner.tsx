"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Search, Trash2, Wand2 } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

type TeamSummary = {
  id: number
  name: string
  category: string | null
  total_games: number
  counted_games: number
  extra_count: number
  issue_count: number
}

type AuditGame = {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  game_date: string
  game_time: string | null
  field: string | null
  category: string | null
  status: string | null
  jornada: number | null
  rival: string
  is_home: boolean
  counts_in_table: boolean
  suggested_delete: boolean
  flags: string[]
}

type TeamAudit = {
  team: { id: number; name: string; category: string | null }
  games: AuditGame[]
  record: {
    played: number
    wins: number
    losses: number
    ties: number
    points: number
    points_for: number
    points_against: number
  }
  extra_count: number
}

const FLAG_INFO: Record<string, { label: string; className: string; help: string }> = {
  duplicado_exacto: {
    label: "Duplicado",
    className: "bg-red-600 text-white",
    help: "Mismo rival, misma categoría y misma fecha más de una vez",
  },
  rival_repetido: {
    label: "Rival repetido",
    className: "bg-orange-500 text-white",
    help: "Ya jugó contra este rival en otra fecha de la temporada",
  },
  doble_jornada: {
    label: "2+ en la jornada",
    className: "bg-amber-400 text-amber-950",
    help: "El equipo tiene más de un partido en esta jornada (puede ser reposición)",
  },
  otra_categoria: {
    label: "Otra categoría",
    className: "bg-purple-600 text-white",
    help: "El partido está en otra categoría; no cuenta en la tabla de este equipo",
  },
  no_cuenta: {
    label: "No cuenta",
    className: "bg-gray-600 text-white",
    help: "Finalizado pero marcado como amistoso, playoff o sin contar para la tabla",
  },
  rival_inexistente: {
    label: "Rival no existe",
    className: "bg-pink-600 text-white",
    help: "El nombre del rival no coincide con ningún equipo de la temporada",
  },
  borrador: {
    label: "Borrador",
    className: "bg-slate-300 text-slate-800",
    help: "Partido en borrador, no visible al público",
  },
}

function formatDate(d: string) {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : "—"
}

export default function AdminTeamGamesCleaner() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [seasonName, setSeasonName] = useState("")
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [onlyIssues, setOnlyIssues] = useState(false)

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [audit, setAudit] = useState<TeamAudit | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true)
    try {
      const res = await fetch("/api/games/team-audit")
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error cargando equipos")
        return
      }
      setTeams(data.teams || [])
      setSeasonName(data.season?.name || "")
    } finally {
      setLoadingTeams(false)
    }
  }, [])

  const loadAudit = useCallback(async (teamId: number) => {
    setLoadingAudit(true)
    setChecked(new Set())
    try {
      const res = await fetch(`/api/games/team-audit?team_id=${teamId}`)
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error cargando partidos")
        setAudit(null)
        return
      }
      setAudit(data)
    } finally {
      setLoadingAudit(false)
    }
  }, [])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  useEffect(() => {
    if (selectedTeamId != null) loadAudit(selectedTeamId)
  }, [selectedTeamId, loadAudit])

  const categories = useMemo(
    () => Array.from(new Set(teams.map((t) => t.category || ""))).filter(Boolean).sort(),
    [teams],
  )

  const visibleTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams.filter((t) => {
      if (category !== "all" && t.category !== category) return false
      if (onlyIssues && t.issue_count === 0) return false
      if (q && !t.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [teams, search, category, onlyIssues])

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectSuggested = () => {
    if (!audit) return
    setChecked(new Set(audit.games.filter((g) => g.suggested_delete).map((g) => g.id)))
  }

  const deleteGames = async (ids: number[]) => {
    if (!audit || !ids.length) return
    const chosen = audit.games.filter((g) => ids.includes(g.id))
    const finished = chosen.filter((g) => g.status === "finalizado").length
    const lines = chosen
      .slice(0, 12)
      .map((g) => `• J${g.jornada ?? "?"} ${formatDate(g.game_date)} ${g.home_team} vs ${g.away_team} (${g.status})`)
      .join("\n")
    const warn = finished
      ? `\n\n⚠ ${finished} ya están finalizados: se borran también su marcador y estadísticas.`
      : ""
    if (!confirm(`¿Borrar ${chosen.length} partido(s)?\n\n${lines}${chosen.length > 12 ? "\n…" : ""}${warn}`)) return

    setDeleting(true)
    try {
      const res = await fetch("/api/games/team-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error al borrar")
        return
      }
      await Promise.all([loadAudit(audit.team.id), loadTeams()])
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="bg-white border-gray-200 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 flex items-center justify-between text-base">
            <span>Equipos {seasonName && <span className="text-gray-500 font-normal">· {seasonName}</span>}</span>
            <Button size="sm" variant="ghost" onClick={loadTeams} disabled={loadingTeams}>
              <RefreshCw className={`w-4 h-4 ${loadingTeams ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipo…"
              className="pl-9 bg-gray-50 border-gray-300"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {getCategoryLabel(c)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox checked={onlyIssues} onCheckedChange={(v) => setOnlyIssues(v === true)} />
            Solo equipos con problemas
          </label>

          <div className="max-h-[60vh] overflow-y-auto -mx-2 divide-y divide-gray-100">
            {loadingTeams && !teams.length && (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            )}
            {visibleTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                  selectedTeamId === t.id ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate">{t.name}</span>
                  {t.extra_count > 0 ? (
                    <Badge className="bg-red-600 text-white shrink-0">{t.extra_count} extra</Badge>
                  ) : t.issue_count > 0 ? (
                    <Badge className="bg-amber-400 text-amber-950 shrink-0">{t.issue_count} revisar</Badge>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {getCategoryLabel(t.category)} · {t.total_games} partidos · {t.counted_games} en tabla
                </div>
              </button>
            ))}
            {!loadingTeams && !visibleTeams.length && (
              <div className="py-6 text-center text-sm text-gray-500">Sin equipos con ese filtro</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200">
        {!selectedTeamId && (
          <CardContent className="py-16 text-center text-gray-500">
            Elige un equipo de la lista para ver sus partidos, los que cuentan en la tabla y los duplicados.
          </CardContent>
        )}

        {selectedTeamId && loadingAudit && (
          <CardContent className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          </CardContent>
        )}

        {selectedTeamId && !loadingAudit && audit && (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 flex flex-wrap items-center justify-between gap-3">
                <span>
                  {audit.team.name}
                  <span className="ml-2 text-sm font-normal text-gray-500">{getCategoryLabel(audit.team.category)}</span>
                </span>
                <div className="flex gap-2 text-sm font-normal">
                  <Badge variant="outline">PJ {audit.record.played}</Badge>
                  <Badge variant="outline">G {audit.record.wins}</Badge>
                  <Badge variant="outline">P {audit.record.losses}</Badge>
                  <Badge variant="outline">E {audit.record.ties}</Badge>
                  <Badge className="bg-emerald-600 text-white">{audit.record.points} pts</Badge>
                </div>
              </CardTitle>
              <p className="text-xs text-gray-500">
                El récord de arriba se calcula solo con los partidos marcados "En tabla" (igual que la tabla de posiciones).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {audit.extra_count > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <span className="flex items-center gap-2 text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    {audit.extra_count} partido(s) duplicado(s). Se sugiere conservar el finalizado o el más antiguo.
                  </span>
                  <Button size="sm" variant="outline" onClick={selectSuggested} className="border-red-300 text-red-700">
                    <Wand2 className="w-4 h-4 mr-1" />
                    Marcar duplicados
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">
                  {audit.games.length} partidos · {checked.size} seleccionados
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!checked.size || deleting}
                  onClick={() => deleteGames(Array.from(checked))}
                >
                  {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Borrar seleccionados
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="w-10 px-3 py-2" />
                      <th className="px-3 py-2 text-left">J</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Rival</th>
                      <th className="px-3 py-2 text-center">Marcador</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Avisos</th>
                      <th className="px-3 py-2 text-center">En tabla</th>
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {audit.games.map((g) => {
                      const mine = g.is_home ? g.home_score : g.away_score
                      const theirs = g.is_home ? g.away_score : g.home_score
                      const hasScore = g.home_score != null || g.away_score != null
                      return (
                        <tr
                          key={g.id}
                          className={
                            g.suggested_delete ? "bg-red-50" : checked.has(g.id) ? "bg-amber-50" : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-3 py-2">
                            <Checkbox checked={checked.has(g.id)} onCheckedChange={() => toggle(g.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{g.jornada ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {formatDate(g.game_date)}
                            <span className="block text-xs text-gray-400">
                              {formatTime(g.game_time)} {g.field || ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-900">
                            <span className="text-xs text-gray-400 mr-1">{g.is_home ? "vs" : "@"}</span>
                            {g.rival}
                            {g.category !== audit.team.category && (
                              <span className="block text-xs text-purple-600">{getCategoryLabel(g.category)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-gray-900">
                            {hasScore ? `${mine ?? 0} - ${theirs ?? 0}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{g.status || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {g.flags.map((f) => (
                                <Badge
                                  key={f}
                                  title={FLAG_INFO[f]?.help}
                                  className={`${FLAG_INFO[f]?.className || "bg-gray-200"} text-[10px] px-1.5 py-0`}
                                >
                                  {FLAG_INFO[f]?.label || f}
                                </Badge>
                              ))}
                              {g.suggested_delete && (
                                <Badge className="bg-red-800 text-white text-[10px] px-1.5 py-0">Sugerido borrar</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {g.counts_in_table ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              disabled={deleting}
                              onClick={() => deleteGames([g.id])}
                              title="Borrar este partido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {!audit.games.length && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          Este equipo no tiene partidos en la temporada activa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {Object.entries(FLAG_INFO).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <Badge className={`${v.className} text-[10px] px-1.5 py-0`}>{v.label}</Badge>
                    {v.help}
                  </span>
                ))}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
