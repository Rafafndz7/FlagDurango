"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { TEAM_CATEGORY_OPTIONS, getCategoryLabel } from "@/lib/categories"
import {
  ADJUSTABLE_FIELDS,
  applyAdjustment,
  type AdjustableField,
  type RecordTotals,
  type StandingRow,
} from "@/lib/standings-calc"

const CATEGORY_OPTIONS = [...TEAM_CATEGORY_OPTIONS, { value: "mixto-recreativo", label: "Mixto Recreativo" }]

const STATUS_OPTIONS = [
  { value: "programado", label: "Programado" },
  { value: "en vivo", label: "En vivo" },
  { value: "finalizado", label: "Finalizado" },
]

const selectClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"

type Adjustments = Record<AdjustableField, number>
const EMPTY_ADJ: Adjustments = { wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0, points: 0 }

const ADJ_ROWS: { field: AdjustableField; short: string; label: string; base?: keyof RecordTotals }[] = [
  { field: "wins", short: "G", label: "Ganados", base: "games_won" },
  { field: "ties", short: "E", label: "Empatados", base: "games_tied" },
  { field: "losses", short: "P", label: "Perdidos", base: "games_lost" },
  { field: "points_for", short: "PF", label: "Puntos a favor", base: "points_for" },
  { field: "points_against", short: "PC", label: "Puntos en contra", base: "points_against" },
  { field: "points", short: "Pts ±", label: "Puntos extra / sanción" },
]

type CategoryGame = {
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
  game_type: string | null
  match_type: string | null
  counts_for_standings: boolean | null
  is_draft: boolean | null
  counts: boolean
}

type SeasonTeam = { id: number; name: string; category: string | null; status: string | null }

type Selection = { type: "team"; id: number } | { type: "game"; id: number } | { type: "manual" } | null

type Flash = { kind: "ok" | "error"; text: string } | null

/** Marcado para tabla (sin importar estado ni categoría) */
function markedForTable(g: CategoryGame) {
  return g.game_type === "regular" && g.counts_for_standings === true && !!g.match_type && g.match_type !== "amistoso"
}

function adjFromRow(row: StandingRow | null | undefined): Adjustments {
  const a = row?.adjustment
  return a ? (Object.fromEntries(ADJUSTABLE_FIELDS.map((f) => [f, Number(a[f]) || 0])) as Adjustments) : { ...EMPTY_ADJ }
}

function sameAdj(a: Adjustments, b: Adjustments) {
  return ADJUSTABLE_FIELDS.every((f) => a[f] === b[f])
}

/** Suma (sign=1) o resta (sign=-1) un resultado a los ajustes de un equipo */
function addResult(adj: Adjustments, mine: number, theirs: number, sign: 1 | -1): Adjustments {
  return {
    ...adj,
    wins: adj.wins + (mine > theirs ? sign : 0),
    losses: adj.losses + (mine < theirs ? sign : 0),
    ties: adj.ties + (mine === theirs ? sign : 0),
    points_for: adj.points_for + sign * mine,
    points_against: adj.points_against + sign * theirs,
  }
}

function formatDate(d: string) {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n)
}

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ success: false, message: "Respuesta inválida del servidor" }))
  if (!data.success) throw new Error(data.message || "Error")
  return data
}

/** Valor final con el ajuste en chiquito si lo hay */
function Cell({ value, delta, className = "" }: { value: number | string; delta?: number; className?: string }) {
  return (
    <td className={`px-2 py-2.5 text-center tabular-nums ${className}`}>
      {value}
      {!!delta && <span className="ml-1 text-[10px] font-semibold text-amber-600">({signed(delta)})</span>}
    </td>
  )
}

export default function AdminStandingsEditor() {
  const [seasonName, setSeasonName] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState("")
  const [rows, setRows] = useState<StandingRow[]>([])
  const [teamRows, setTeamRows] = useState<StandingRow[]>([])
  const [games, setGames] = useState<CategoryGame[]>([])
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0)
  const [selection, setSelection] = useState<Selection>(null)
  const [onlySelectedTeam, setOnlySelectedTeam] = useState(true)
  const [flash, setFlash] = useState<Flash>(null)

  const load = useCallback(async (cat?: string) => {
    setLoading(true)
    try {
      const qs = cat ? `?category=${encodeURIComponent(cat)}` : ""
      const res = await fetch(`/api/admin/standings${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.success) {
        setFlash({ kind: "error", text: data.message || "Error cargando la tabla" })
        return
      }
      setSeasonName(data.season?.name || "")
      setCategories(data.categories || [])
      setCategory(data.category || "")
      setRows(data.rows || [])
      setTeamRows(data.team_rows || [])
      setGames(data.games || [])
      setSeasonTeams(data.season_teams || [])
      setVersion((v) => v + 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  const rowsByName = useMemo(() => new Map(teamRows.map((r) => [r.team_name, r])), [teamRows])

  /** Recarga la tabla y avisa con los puntos nuevos de los equipos tocados */
  const afterChange = useCallback(
    async (message: string, teams: string[] = []) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : ""
      const res = await fetch(`/api/admin/standings${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setRows(data.rows || [])
        setTeamRows(data.team_rows || [])
        setGames(data.games || [])
        setSeasonTeams(data.season_teams || [])
        setVersion((v) => v + 1)
        const fresh = new Map<string, StandingRow>((data.team_rows || []).map((r: StandingRow) => [r.team_name, r]))
        const detail = teams
          .map((name) => fresh.get(name))
          .filter(Boolean)
          .map((r) => `${r!.team_name}: ${r!.points} pts (${r!.position}°)`)
          .join(" · ")
        setFlash({ kind: "ok", text: detail ? `${message} — ${detail}` : message })
      } else {
        setFlash({ kind: "error", text: data.message || "Se guardó, pero no se pudo recargar la tabla" })
      }
    },
    [category],
  )

  const selectedTeamId = selection?.type === "team" ? selection.id : null
  const selectedTeamName = selectedTeamId != null ? seasonTeams.find((t) => t.id === selectedTeamId)?.name : null
  const selectedGame = selection?.type === "game" ? games.find((g) => g.id === selection.id) || null : null

  const visibleGames = useMemo(() => {
    if (selectedTeamName && onlySelectedTeam) {
      return games.filter((g) => g.home_team === selectedTeamName || g.away_team === selectedTeamName)
    }
    return games
  }, [games, selectedTeamName, onlySelectedTeam])

  return (
    <div className="space-y-6">
      {flash && (
        <div
          className={`sticky top-2 z-20 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${
            flash.kind === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <span className="flex items-center gap-2">
            {flash.kind === "ok" && <CheckCircle className="w-4 h-4 shrink-0" />}
            {flash.text}
          </span>
          <button onClick={() => setFlash(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 flex flex-wrap items-center justify-between gap-3 text-base">
            <span>
              Tabla de posiciones {seasonName && <span className="text-gray-500 font-normal">· {seasonName}</span>}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => {
                  setSelection(null)
                  load(e.target.value)
                }}
                className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => load(category)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
          <p className="text-xs text-gray-500">
            Es la misma tabla que ve el público. Pícale a un equipo o a un partido para editarlo abajo. Los números en{" "}
            <span className="font-semibold text-amber-600">(naranja)</span> son ajustes manuales.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Pos</th>
                  <th className="px-3 py-2 text-left">Equipo</th>
                  <th className="px-2 py-2 text-center">PJ</th>
                  <th className="px-2 py-2 text-center">G</th>
                  <th className="px-2 py-2 text-center">E</th>
                  <th className="px-2 py-2 text-center">P</th>
                  <th className="px-2 py-2 text-center">PF</th>
                  <th className="px-2 py-2 text-center">PC</th>
                  <th className="px-2 py-2 text-center">DP</th>
                  <th className="px-2 py-2 text-center">Pts</th>
                  <th className="px-3 py-2 text-center">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && !rows.length && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const g = r.from_games
                  const selected = selectedTeamId === r.team_id
                  return (
                    <tr
                      key={r.team_id}
                      onClick={() => {
                        setSelection({ type: "team", id: r.team_id })
                        setOnlySelectedTeam(true)
                      }}
                      className={`cursor-pointer ${selected ? "bg-emerald-100" : "hover:bg-emerald-50"}`}
                    >
                      <td className="px-3 py-2.5 font-bold text-gray-500">{r.position}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        <span className="flex items-center gap-2">
                          {r.team_name}
                          {r.adjustment && (
                            <Badge
                              className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0"
                              title={r.adjustment.note || ""}
                            >
                              Ajustado
                            </Badge>
                          )}
                        </span>
                      </td>
                      <Cell value={r.games_played} delta={r.games_played - g.games_played} />
                      <Cell value={r.games_won} delta={r.games_won - g.games_won} className="text-emerald-700" />
                      <Cell value={r.games_tied} delta={r.games_tied - g.games_tied} />
                      <Cell value={r.games_lost} delta={r.games_lost - g.games_lost} className="text-red-600" />
                      <Cell value={r.points_for} delta={r.points_for - g.points_for} />
                      <Cell value={r.points_against} delta={r.points_against - g.points_against} />
                      <Cell value={signed(r.point_difference)} />
                      <Cell value={r.points} delta={r.points - g.points} className="font-bold text-blue-700" />
                      <td className="px-3 py-2.5 text-center tabular-nums text-gray-600">{r.win_percentage}%</td>
                    </tr>
                  )
                })}
                {!loading && !rows.length && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">
                      No hay equipos activos en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="bg-white border-gray-200 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 flex flex-wrap items-center justify-between gap-2 text-base">
              <span>
                Partidos {selectedTeamName && onlySelectedTeam ? `de ${selectedTeamName}` : `· ${getCategoryLabel(category)}`}
                <span className="ml-2 text-sm font-normal text-gray-500">({visibleGames.length})</span>
              </span>
              <div className="flex items-center gap-2">
                {selectedTeamName && (
                  <Button size="sm" variant="outline" onClick={() => setOnlySelectedTeam((v) => !v)}>
                    {onlySelectedTeam ? "Ver todos" : `Solo ${selectedTeamName}`}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-300 text-emerald-700"
                  onClick={() => setSelection({ type: "manual" })}
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Resultado sin partido
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">J</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Partido</th>
                    <th className="px-3 py-2 text-center">Tabla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleGames.map((g) => {
                    const selected = selectedGame?.id === g.id
                    const friendly = g.match_type === "amistoso" || g.game_type === "friendly"
                    return (
                      <tr
                        key={g.id}
                        onClick={() => setSelection({ type: "game", id: g.id })}
                        className={`cursor-pointer ${selected ? "bg-emerald-100" : "hover:bg-emerald-50"}`}
                      >
                        <td className="px-3 py-2 font-medium text-gray-900">{g.jornada ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {formatDate(g.game_date)}
                          <span className="block text-xs text-gray-400">
                            {(g.game_time || "").slice(0, 5)} {g.field || ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          <span className={g.home_team === selectedTeamName ? "font-semibold" : ""}>{g.home_team}</span>
                          <span className="mx-2 font-mono">
                            {g.home_score ?? "–"} - {g.away_score ?? "–"}
                          </span>
                          <span className={g.away_team === selectedTeamName ? "font-semibold" : ""}>{g.away_team}</span>
                          <span className="block text-xs text-gray-500">
                            <span className="capitalize">{g.status || "—"}</span>
                            {friendly && " · Amistoso"}
                            {g.category !== category && (
                              <span className="text-purple-600"> · {getCategoryLabel(g.category)}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {g.counts ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!visibleGames.length && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        Sin partidos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 xl:sticky xl:top-4 h-fit">
          {selection === null && (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-12 text-center text-gray-500">
                Pícale a un equipo de la tabla o a un partido para editarlo aquí. Para sumar un resultado que ya no tiene
                partido, usa <b>Resultado sin partido</b>.
              </CardContent>
            </Card>
          )}

          {selection?.type === "team" && (
            <TeamPanel
              key={`team-${selection.id}-${version}`}
              teamId={selection.id}
              row={teamRows.find((r) => r.team_id === selection.id) || null}
              onSaved={afterChange}
              onError={(text) => setFlash({ kind: "error", text })}
              onClose={() => setSelection(null)}
            />
          )}

          {selection?.type === "game" && selectedGame && (
            <GamePanel
              key={`game-${selectedGame.id}-${version}`}
              game={selectedGame}
              teamCategory={category}
              rowsByName={rowsByName}
              seasonTeams={seasonTeams}
              onSaved={afterChange}
              onDeleted={(message, teams) => {
                setSelection(null)
                afterChange(message, teams)
              }}
              onError={(text) => setFlash({ kind: "error", text })}
              onClose={() => setSelection(null)}
            />
          )}

          {selection?.type === "manual" && (
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-900 flex items-center justify-between text-base">
                  Resultado sin partido
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelection(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Suma un resultado a la tabla de los dos equipos aunque el partido no exista (por ejemplo, uno que ya
                  borraste o un default).
                </p>
              </CardHeader>
              <CardContent>
                <TwoTeamAdjuster
                  key={`manual-${version}`}
                  selectable
                  initialHome={rows[0]?.team_name || ""}
                  initialAway={rows[1]?.team_name || ""}
                  rowsByName={rowsByName}
                  options={rows.map((r) => r.team_name)}
                  onSaved={afterChange}
                  onError={(text) => setFlash({ kind: "error", text })}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/** Ajustes de un equipo: por partidos · ajuste (− +) · en tabla */
function AdjBox({
  row,
  draft,
  onChange,
}: {
  row: StandingRow
  draft: Adjustments
  onChange: (next: Adjustments) => void
}) {
  const total = applyAdjustment(row.from_games, draft)
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-600">
            <tr>
              <th className="px-2 py-1.5 text-left" />
              <th className="px-2 py-1.5 text-center">Partidos</th>
              <th className="px-2 py-1.5 text-center">Ajuste</th>
              <th className="px-2 py-1.5 text-center">Tabla</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ADJ_ROWS.map(({ field, short, label, base }) => (
              <tr key={field}>
                <td className="px-2 py-1.5 text-gray-900" title={label}>
                  <span className="font-semibold">{short}</span>
                  <span className="ml-1 hidden text-xs text-gray-500 sm:inline">{label}</span>
                </td>
                <td className="px-2 py-1.5 text-center tabular-nums text-gray-500">{base ? row.from_games[base] : "—"}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onChange({ ...draft, [field]: draft[field] - 1 })}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={draft[field]}
                      onChange={(e) => onChange({ ...draft, [field]: Math.trunc(Number(e.target.value) || 0) })}
                      className={`h-7 w-16 px-1 text-center ${draft[field] ? "border-amber-400 bg-amber-50" : ""}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onChange({ ...draft, [field]: draft[field] + 1 })}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center font-semibold tabular-nums text-gray-900">
                  {base ? total[base] : signed(draft.points)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Badge variant="outline">PJ {total.games_played}</Badge>
        <Badge variant="outline">G {total.games_won}</Badge>
        <Badge variant="outline">E {total.games_tied}</Badge>
        <Badge variant="outline">P {total.games_lost}</Badge>
        <Badge variant="outline">DP {signed(total.points_for - total.points_against)}</Badge>
        <Badge className="bg-blue-600 text-white">{total.points} pts</Badge>
      </div>
    </div>
  )
}

function TeamPanel({
  teamId,
  row,
  onSaved,
  onError,
  onClose,
}: {
  teamId: number
  row: StandingRow | null
  onSaved: (message: string, teams?: string[]) => Promise<void>
  onError: (text: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Adjustments>(adjFromRow(row))
  const [note, setNote] = useState(row?.adjustment?.note || "")
  const [saving, setSaving] = useState(false)
  const [showData, setShowData] = useState(false)
  const [team, setTeam] = useState<Record<string, any> | null>(null)
  const [teamForm, setTeamForm] = useState<Record<string, any>>({})

  const toggleData = async () => {
    const next = !showData
    setShowData(next)
    if (!next || team) return
    try {
      const res = await fetch(`/api/admin/standings?team_id=${teamId}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.success) return onError(data.message || "Error cargando el equipo")
      setTeam(data.team)
      setTeamForm({ ...data.team })
    } catch (e: any) {
      onError(e.message || "Error cargando el equipo")
    }
  }

  const original = adjFromRow(row)
  const dirty = !sameAdj(draft, original) || note.trim() !== (row?.adjustment?.note || "")

  const saveAdj = async (values: Adjustments, noteText: string, message: string) => {
    setSaving(true)
    try {
      await sendJson("/api/admin/standings", "PUT", { items: [{ team_id: teamId, ...values, note: noteText }] })
      await onSaved(message, row ? [row.team_name] : [])
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveTeam = async () => {
    if (!team) return
    const renamed = teamForm.name !== team.name
    if (renamed && !confirm(`¿Cambiar el nombre a "${teamForm.name}"? También se renombran sus partidos de la temporada.`)) return
    setSaving(true)
    try {
      const data = await sendJson("/api/admin/standings/team", "PUT", {
        id: team.id,
        name: teamForm.name,
        category: teamForm.category,
        status: teamForm.status,
        color1: teamForm.color1,
        color2: teamForm.color2,
        logo_url: teamForm.logo_url || null,
        captain_name: teamForm.captain_name || null,
        captain_phone: teamForm.captain_phone || null,
        coach_name: teamForm.coach_name || null,
        coach_phone: teamForm.coach_phone || null,
        paid: Boolean(teamForm.paid),
      })
      await onSaved(
        data.renamed_games ? `Equipo guardado; se renombraron ${data.renamed_games} partido(s)` : "Equipo guardado",
        [teamForm.name],
      )
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-900 flex items-center justify-between gap-2 text-base">
          <span className="flex flex-wrap items-center gap-2">
            {row?.team_name || team?.name || "Equipo"}
            {row && <Badge className="bg-emerald-600 text-white">{row.position}°</Badge>}
            {row && <Badge variant="outline">{getCategoryLabel(row.team_category)}</Badge>}
          </span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
        <p className="text-xs text-gray-500">
          Cada G suma 1 PJ y 3 pts; cada E suma 1 PJ y 1 pt. "Pts ±" suma o resta puntos directo (negativo = sanción).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {row ? (
          <>
            <AdjBox row={row} draft={draft} onChange={setDraft} />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo del ajuste (opcional)"
              className="bg-white"
            />
            <div className="flex flex-wrap justify-end gap-2">
              {row.adjustment && (
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    if (!confirm("¿Quitar todos los ajustes de este equipo?")) return
                    setDraft({ ...EMPTY_ADJ })
                    setNote("")
                    saveAdj({ ...EMPTY_ADJ }, "", "Ajustes quitados")
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Quitar ajustes
                </Button>
              )}
              <Button
                disabled={saving || !dirty}
                onClick={() => saveAdj(draft, note, "Tabla guardada")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar en la tabla
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Este equipo está inactivo o sin categoría: no sale en la tabla.</p>
        )}

        <div className="border-t border-gray-100 pt-3">
          <Button variant="ghost" size="sm" className="px-0 text-gray-700" onClick={toggleData}>
            {showData ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Datos del equipo
          </Button>
          {showData && !team && <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mt-2" />}
          {showData && team && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Nombre (si lo cambias, se renombran sus partidos)</Label>
                  <Input
                    value={teamForm.name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <select
                    className={selectClass}
                    value={teamForm.category || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                  >
                    {teamForm.category && !CATEGORY_OPTIONS.some((c) => c.value === teamForm.category) && (
                      <option value={teamForm.category}>{teamForm.category}</option>
                    )}
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <select
                    className={selectClass}
                    value={teamForm.status || "active"}
                    onChange={(e) => setTeamForm({ ...teamForm, status: e.target.value })}
                  >
                    <option value="active">Activo (sale en la tabla)</option>
                    <option value="inactive">Inactivo (no sale)</option>
                    {teamForm.status && !["active", "inactive"].includes(teamForm.status) && (
                      <option value={teamForm.status}>{teamForm.status}</option>
                    )}
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <Label className="text-xs">Color 1</Label>
                    <Input
                      type="color"
                      value={teamForm.color1 || "#3B82F6"}
                      onChange={(e) => setTeamForm({ ...teamForm, color1: e.target.value })}
                      className="h-9 w-16 p-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color 2</Label>
                    <Input
                      type="color"
                      value={teamForm.color2 || "#1E40AF"}
                      onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                      className="h-9 w-16 p-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm text-gray-800 cursor-pointer">
                    <Checkbox
                      checked={Boolean(teamForm.paid)}
                      onCheckedChange={(v) => setTeamForm({ ...teamForm, paid: v === true })}
                    />
                    Pagado
                  </label>
                </div>
                <div>
                  <Label className="text-xs">URL del logo</Label>
                  <Input
                    value={teamForm.logo_url || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Capitán</Label>
                  <Input
                    value={teamForm.captain_name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, captain_name: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tel. capitán</Label>
                  <Input
                    value={teamForm.captain_phone || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, captain_phone: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Entrenador</Label>
                  <Input
                    value={teamForm.coach_name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, coach_name: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tel. entrenador</Label>
                  <Input
                    value={teamForm.coach_phone || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, coach_phone: e.target.value })}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveTeam} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Guardar equipo
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Ajusta a los dos equipos a la vez; con "Sumar resultado" llena G/E/P y PF/PC de ambos */
function TwoTeamAdjuster({
  initialHome,
  initialAway,
  initialHomeScore = 0,
  initialAwayScore = 0,
  rowsByName,
  options = [],
  selectable = false,
  onSaved,
  onError,
}: {
  initialHome: string
  initialAway: string
  initialHomeScore?: number
  initialAwayScore?: number
  rowsByName: Map<string, StandingRow>
  options?: string[]
  selectable?: boolean
  onSaved: (message: string, teams?: string[]) => Promise<void>
  onError: (text: string) => void
}) {
  const [home, setHome] = useState(initialHome)
  const [away, setAway] = useState(initialAway)
  const homeRow = rowsByName.get(home) || null
  const awayRow = rowsByName.get(away) || null
  const [homeDraft, setHomeDraft] = useState<Adjustments>(adjFromRow(homeRow))
  const [awayDraft, setAwayDraft] = useState<Adjustments>(adjFromRow(awayRow))
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const pickHome = (name: string) => {
    setHome(name)
    setHomeDraft(adjFromRow(rowsByName.get(name)))
  }
  const pickAway = (name: string) => {
    setAway(name)
    setAwayDraft(adjFromRow(rowsByName.get(name)))
  }

  const applyResult = (sign: 1 | -1) => {
    if (homeRow) setHomeDraft((d) => addResult(d, homeScore, awayScore, sign))
    if (awayRow) setAwayDraft((d) => addResult(d, awayScore, homeScore, sign))
  }

  const dirty =
    (homeRow && !sameAdj(homeDraft, adjFromRow(homeRow))) || (awayRow && !sameAdj(awayDraft, adjFromRow(awayRow)))

  const save = async () => {
    if (homeRow && awayRow && homeRow.team_id === awayRow.team_id) return onError("Elige dos equipos distintos")
    const items = []
    const keepNote = (row: StandingRow) => [row.adjustment?.note, note.trim()].filter(Boolean).join(" · ")
    if (homeRow) items.push({ team_id: homeRow.team_id, ...homeDraft, note: keepNote(homeRow) })
    if (awayRow) items.push({ team_id: awayRow.team_id, ...awayDraft, note: keepNote(awayRow) })
    if (!items.length) return
    setSaving(true)
    try {
      await sendJson("/api/admin/standings", "PUT", { items })
      await onSaved(
        "Tabla guardada",
        [homeRow?.team_name, awayRow?.team_name].filter(Boolean) as string[],
      )
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const teamColumn = (
    name: string,
    row: StandingRow | null,
    draft: Adjustments,
    setDraft: (a: Adjustments) => void,
    pick: (n: string) => void,
  ) => (
    <div className="space-y-2">
      {selectable ? (
        <select className={selectClass} value={name} onChange={(e) => pick(e.target.value)}>
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ) : (
        <div className="font-semibold text-gray-900">
          {name}
          {row && <span className="ml-2 text-xs font-normal text-gray-500">{row.position}° · {row.points} pts</span>}
        </div>
      )}
      {row ? (
        <AdjBox row={row} draft={draft} onChange={setDraft} />
      ) : (
        <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">No está activo en ninguna tabla.</p>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div>
          <Label className="text-xs text-emerald-900">{home || "Local"}</Label>
          <Input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(Math.trunc(Number(e.target.value) || 0))}
            className="h-9 w-20 bg-white text-center"
          />
        </div>
        <span className="pb-2 font-bold text-emerald-900">-</span>
        <div>
          <Label className="text-xs text-emerald-900">{away || "Visitante"}</Label>
          <Input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(Math.trunc(Number(e.target.value) || 0))}
            className="h-9 w-20 bg-white text-center"
          />
        </div>
        <Button size="sm" onClick={() => applyResult(1)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-1" />
          Sumar resultado
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyResult(-1)}>
          <Minus className="w-4 h-4 mr-1" />
          Restar resultado
        </Button>
        <p className="w-full text-xs text-emerald-900">
          Llena G/E/P y PF/PC de los dos equipos con ese marcador. Revisa y luego "Guardar los dos".
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teamColumn(home, homeRow, homeDraft, setHomeDraft, pickHome)}
        {teamColumn(away, awayRow, awayDraft, setAwayDraft, pickAway)}
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo (opcional), ej. Partido J3 ganado por default"
        className="bg-white"
      />
      <div className="flex justify-end">
        <Button
          disabled={saving || !dirty}
          onClick={save}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Guardar los dos
        </Button>
      </div>
    </div>
  )
}

function GamePanel({
  game,
  teamCategory,
  rowsByName,
  seasonTeams,
  onSaved,
  onDeleted,
  onError,
  onClose,
}: {
  game: CategoryGame
  teamCategory: string
  rowsByName: Map<string, StandingRow>
  seasonTeams: SeasonTeam[]
  onSaved: (message: string, teams?: string[]) => Promise<void>
  onDeleted: (message: string, teams: string[]) => void
  onError: (text: string) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ ...game, counts_toggle: markedForTable(game) })
  const [saving, setSaving] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const names = seasonTeams.map((t) => t.name)
  const teams = [game.home_team, game.away_team]

  const saveGame = async () => {
    const fields = ["home_team", "away_team", "home_score", "away_score", "status", "category", "jornada", "game_date", "game_time", "field"] as const
    const update: Record<string, any> = { id: game.id }
    for (const f of fields) {
      if ((form as any)[f] !== (game as any)[f]) update[f] = (form as any)[f]
    }
    if (form.counts_toggle !== markedForTable(game)) {
      if (form.counts_toggle) {
        update.game_type = "regular"
        if (!game.match_type || game.match_type === "amistoso") update.match_type = "jornada"
      } else {
        update.game_type = "friendly"
        update.match_type = "amistoso"
      }
    }
    if (Object.keys(update).length === 1) return
    setSaving(true)
    try {
      await sendJson("/api/games", "PUT", update)
      await onSaved("Partido guardado", [form.home_team, form.away_team])
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteGame = async (keepResult: boolean) => {
    const text = keepResult
      ? `¿Borrar ${game.home_team} vs ${game.away_team} y CONSERVAR su resultado en la tabla de los dos equipos?`
      : `¿Borrar ${game.home_team} vs ${game.away_team}? Su resultado se quita de la tabla.`
    if (!confirm(text)) return
    setSaving(true)
    try {
      const data = await sendJson("/api/admin/standings", "POST", { game_id: game.id, keep_result: keepResult })
      onDeleted(
        keepResult && data.kept_for?.length
          ? `Partido borrado; su resultado se quedó en la tabla de ${data.kept_for.join(" y ")}`
          : "Partido borrado",
        teams,
      )
    } catch (e: any) {
      onError(e.message)
      setSaving(false)
    }
  }

  const teamSelect = (key: "home_team" | "away_team") => (
    <select className={selectClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
      {!names.includes(form[key]) && <option value={form[key]}>{form[key]} (no existe)</option>}
      {names.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-900 flex items-start justify-between gap-2 text-base">
          <span>
            {game.home_team} <span className="font-mono">{game.home_score ?? "–"} - {game.away_score ?? "–"}</span>{" "}
            {game.away_team}
            <span className="block text-xs font-normal text-gray-500">
              J{game.jornada ?? "?"} · {formatDate(game.game_date)} {(game.game_time || "").slice(0, 5)} {game.field || ""} ·{" "}
              <span className="capitalize">{game.status}</span> · {getCategoryLabel(game.category)}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {game.counts ? (
              <Badge className="bg-emerald-600 text-white">Cuenta en tabla</Badge>
            ) : (
              <Badge variant="outline">No cuenta</Badge>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </span>
        </CardTitle>
        {!game.counts && game.status === "finalizado" && game.category !== teamCategory && (
          <p className="text-xs text-purple-700">
            Este partido es de {getCategoryLabel(game.category)}; no cuenta en la tabla de {getCategoryLabel(teamCategory)}.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-gray-900">Mover la tabla de los dos equipos</div>
          <TwoTeamAdjuster
            initialHome={game.home_team}
            initialAway={game.away_team}
            initialHomeScore={game.home_score ?? 0}
            initialAwayScore={game.away_score ?? 0}
            rowsByName={rowsByName}
            onSaved={onSaved}
            onError={onError}
          />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <Button variant="ghost" size="sm" className="px-0 text-gray-700" onClick={() => setShowEdit((v) => !v)}>
            {showEdit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Editar partido (marcador, estado, equipos, fecha…)
          </Button>
          {showEdit && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Local</Label>
                  {teamSelect("home_team")}
                </div>
                <div>
                  <Label className="text-xs">Visitante</Label>
                  {teamSelect("away_team")}
                </div>
                <div>
                  <Label className="text-xs">Marcador local</Label>
                  <Input
                    type="number"
                    value={form.home_score ?? ""}
                    onChange={(e) => setForm({ ...form, home_score: e.target.value === "" ? null : Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Marcador visitante</Label>
                  <Input
                    type="number"
                    value={form.away_score ?? ""}
                    onChange={(e) => setForm({ ...form, away_score: e.target.value === "" ? null : Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <select
                    className={selectClass}
                    value={form.status || "programado"}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                    {form.status && !STATUS_OPTIONS.some((s) => s.value === form.status) && (
                      <option value={form.status}>{form.status}</option>
                    )}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Categoría del partido</Label>
                  <select
                    className={selectClass}
                    value={form.category || ""}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {form.category && !CATEGORY_OPTIONS.some((c) => c.value === form.category) && (
                      <option value={form.category}>{form.category}</option>
                    )}
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Jornada</Label>
                  <Input
                    type="number"
                    value={form.jornada ?? ""}
                    onChange={(e) => setForm({ ...form, jornada: e.target.value === "" ? null : Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input
                    type="date"
                    value={form.game_date}
                    onChange={(e) => setForm({ ...form, game_date: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={(form.game_time || "").slice(0, 5)}
                    onChange={(e) => setForm({ ...form, game_time: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Campo</Label>
                  <Input
                    value={form.field || ""}
                    onChange={(e) => setForm({ ...form, field: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-800 sm:col-span-2 cursor-pointer">
                  <Checkbox
                    checked={form.counts_toggle}
                    onCheckedChange={(v) => setForm({ ...form, counts_toggle: v === true })}
                  />
                  Cuenta en tabla (si no, queda como amistoso). Solo cuenta si está Finalizado.
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveGame} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Guardar partido
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
          {game.counts && (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => deleteGame(true)}
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Borrar y conservar resultado en la tabla
            </Button>
          )}
          <Button variant="destructive" disabled={saving} onClick={() => deleteGame(false)}>
            <Trash2 className="w-4 h-4 mr-1" />
            {game.counts ? "Borrar y quitarlo de la tabla" : "Borrar partido"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
