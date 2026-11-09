"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Loader2, Minus, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
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

const ADJ_ROWS: { field: AdjustableField; label: string; base?: keyof RecordTotals; help?: string }[] = [
  { field: "wins", label: "Ganados (G)", base: "games_won", help: "Cada G suma 1 PJ y 3 puntos" },
  { field: "ties", label: "Empatados (E)", base: "games_tied", help: "Cada E suma 1 PJ y 1 punto" },
  { field: "losses", label: "Perdidos (P)", base: "games_lost", help: "Cada P suma 1 PJ" },
  { field: "points_for", label: "Puntos a favor (PF)", base: "points_for" },
  { field: "points_against", label: "Puntos en contra (PC)", base: "points_against" },
  { field: "points", label: "Puntos extra / sanción", help: "Suma o resta puntos directo (negativo = sanción)" },
]

type TeamGame = {
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
  is_home: boolean
  rival: string
  counts: boolean
}

/** Marcado para tabla (sin importar estado ni categoría) */
function markedForTable(g: TeamGame) {
  return g.game_type === "regular" && g.counts_for_standings === true && !!g.match_type && g.match_type !== "amistoso"
}

type TeamDetail = {
  team: Record<string, any>
  row: StandingRow | null
  position_total: number
  games: TeamGame[]
  season_teams: { id: number; name: string; category: string | null; status: string | null }[]
}

function formatDate(d: string) {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n)
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
  const [category, setCategory] = useState<string>("")
  const [rows, setRows] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)

  const loadTable = useCallback(async (cat?: string) => {
    setLoading(true)
    try {
      const qs = cat ? `?category=${encodeURIComponent(cat)}` : ""
      const res = await fetch(`/api/admin/standings${qs}`)
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error cargando la tabla")
        return
      }
      setSeasonName(data.season?.name || "")
      setCategories(data.categories || [])
      setCategory(data.category || "")
      setRows(data.rows || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTable()
  }, [loadTable])

  return (
    <>
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 flex flex-wrap items-center justify-between gap-3 text-base">
            <span>
              Tabla de posiciones {seasonName && <span className="text-gray-500 font-normal">· {seasonName}</span>}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => loadTable(e.target.value)}
                className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => loadTable(category)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
          <p className="text-xs text-gray-500">
            Es la misma tabla que ve el público. Pícale a un equipo para ajustar sus números, editar sus partidos o sus
            datos. Los números en <span className="font-semibold text-amber-600">(naranja)</span> son ajustes manuales.
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
                  const pointsDelta = r.points - g.points
                  return (
                    <tr
                      key={r.team_id}
                      onClick={() => setSelectedTeamId(r.team_id)}
                      className="cursor-pointer hover:bg-emerald-50"
                    >
                      <td className="px-3 py-2.5 font-bold text-gray-500">{r.position}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        <span className="flex items-center gap-2">
                          {r.team_name}
                          {r.adjustment && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0" title={r.adjustment.note || ""}>
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
                      <Cell value={r.points} delta={pointsDelta} className="font-bold text-blue-700" />
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

      <TeamEditorDialog
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
        onChanged={() => loadTable(category)}
      />
    </>
  )
}

function TeamEditorDialog({
  teamId,
  onClose,
  onChanged,
}: {
  teamId: number | null
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adj, setAdj] = useState<Adjustments>(EMPTY_ADJ)
  const [note, setNote] = useState("")
  const [teamForm, setTeamForm] = useState<Record<string, any>>({})
  const [editingGame, setEditingGame] = useState<(TeamGame & { counts_toggle: boolean }) | null>(null)

  const load = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/standings?team_id=${id}`)
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error cargando el equipo")
        return
      }
      setDetail(data)
      const a = data.row?.adjustment
      setAdj(a ? Object.fromEntries(ADJUSTABLE_FIELDS.map((f) => [f, a[f] || 0])) as Adjustments : EMPTY_ADJ)
      setNote(a?.note || "")
      setTeamForm({ ...data.team })
      setEditingGame(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (teamId != null) load(teamId)
    else setDetail(null)
  }, [teamId, load])

  const fromGames: RecordTotals | null = detail?.row?.from_games || null
  const preview = useMemo(() => (fromGames ? applyAdjustment(fromGames, adj) : null), [fromGames, adj])

  const refreshAll = async () => {
    if (teamId != null) await load(teamId)
    onChanged()
  }

  const saveAdjustment = async (values: Adjustments, noteText: string) => {
    if (!detail) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/standings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: detail.team.id, ...values, note: noteText }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error guardando el ajuste")
        return
      }
      await refreshAll()
    } finally {
      setSaving(false)
    }
  }

  const saveTeam = async () => {
    if (!detail) return
    const renamed = teamForm.name !== detail.team.name
    if (renamed && !confirm(`¿Cambiar el nombre a "${teamForm.name}"? También se renombran sus partidos de la temporada.`)) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/standings/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: detail.team.id,
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
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error guardando el equipo")
        return
      }
      if (data.renamed_games) alert(`Equipo guardado. Se renombraron ${data.renamed_games} partido(s).`)
      await refreshAll()
    } finally {
      setSaving(false)
    }
  }

  const saveGame = async () => {
    if (!editingGame || !detail) return
    const original = detail.games.find((g) => g.id === editingGame.id)
    if (!original) return
    const fields = ["home_team", "away_team", "home_score", "away_score", "status", "category", "jornada", "game_date", "game_time", "field"] as const
    const update: Record<string, any> = { id: editingGame.id }
    for (const f of fields) {
      if ((editingGame as any)[f] !== (original as any)[f]) update[f] = (editingGame as any)[f]
    }
    if (editingGame.counts_toggle !== markedForTable(original)) {
      if (editingGame.counts_toggle) {
        update.game_type = "regular"
        if (!original.match_type || original.match_type === "amistoso") update.match_type = "jornada"
      } else {
        update.game_type = "friendly"
        update.match_type = "amistoso"
      }
    }
    if (Object.keys(update).length === 1) {
      setEditingGame(null)
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error guardando el partido")
        return
      }
      await refreshAll()
    } finally {
      setSaving(false)
    }
  }

  const deleteGame = async (g: TeamGame) => {
    if (!confirm(`¿Borrar el partido J${g.jornada ?? "?"} ${g.home_team} vs ${g.away_team}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/games?id=${g.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error borrando el partido")
        return
      }
      await refreshAll()
    } finally {
      setSaving(false)
    }
  }

  const team = detail?.team
  const row = detail?.row
  const hasAdj = ADJUSTABLE_FIELDS.some((f) => adj[f] !== 0) || !!note.trim()
  const dirtyAdj =
    ADJUSTABLE_FIELDS.some((f) => adj[f] !== (row?.adjustment?.[f] || 0)) || note.trim() !== (row?.adjustment?.note || "")
  const rivals = (detail?.season_teams || []).map((t) => t.name)

  return (
    <Dialog open={teamId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex flex-wrap items-center gap-2">
            {team?.name || "Equipo"}
            {team && <Badge variant="outline">{getCategoryLabel(team.category)}</Badge>}
            {row && (
              <Badge className="bg-emerald-600 text-white">
                {row.position}° de {detail?.position_total}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {row
              ? `PJ ${row.games_played} · G ${row.games_won} · E ${row.games_tied} · P ${row.games_lost} · PF ${row.points_for} · PC ${row.points_against} · ${row.points} pts`
              : team && team.status !== "active"
                ? "Este equipo está inactivo: no sale en la tabla."
                : ""}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail && (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          </div>
        )}

        {detail && team && (
          <Tabs defaultValue="tabla" className="mt-2">
            <TabsList>
              <TabsTrigger value="tabla">Tabla</TabsTrigger>
              <TabsTrigger value="partidos">Partidos ({detail.games.length})</TabsTrigger>
              <TabsTrigger value="equipo">Datos del equipo</TabsTrigger>
            </TabsList>

            <TabsContent value="tabla" className="space-y-4 pt-2">
              {!fromGames ? (
                <p className="text-sm text-gray-500">
                  El equipo no sale en la tabla (está inactivo o no tiene categoría). Actívalo en "Datos del equipo".
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Concepto</th>
                          <th className="px-3 py-2 text-center">Por partidos</th>
                          <th className="px-3 py-2 text-center">Ajuste</th>
                          <th className="px-3 py-2 text-center">En tabla</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ADJ_ROWS.map(({ field, label, base, help }) => {
                          const baseValue = base ? fromGames[base] : null
                          const total = base ? (preview as RecordTotals)[base] : adj.points
                          return (
                            <tr key={field}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">{label}</div>
                                {help && <div className="text-xs text-gray-500">{help}</div>}
                              </td>
                              <td className="px-3 py-2 text-center tabular-nums text-gray-600">{baseValue ?? "—"}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8"
                                    onClick={() => setAdj({ ...adj, [field]: adj[field] - 1 })}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={adj[field]}
                                    onChange={(e) => setAdj({ ...adj, [field]: Math.trunc(Number(e.target.value) || 0) })}
                                    className={`h-8 w-20 text-center ${adj[field] ? "border-amber-400 bg-amber-50" : ""}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8"
                                    onClick={() => setAdj({ ...adj, [field]: adj[field] + 1 })}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-semibold tabular-nums text-gray-900">
                                {field === "points" ? signed(total) : total}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {preview && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">PJ {preview.games_played}</Badge>
                      <Badge variant="outline">G {preview.games_won}</Badge>
                      <Badge variant="outline">E {preview.games_tied}</Badge>
                      <Badge variant="outline">P {preview.games_lost}</Badge>
                      <Badge variant="outline">DP {signed(preview.points_for - preview.points_against)}</Badge>
                      <Badge className="bg-blue-600 text-white">{preview.points} pts</Badge>
                      <span className="text-xs text-gray-500 self-center">
                        Pts = 3 × G + E {adj.points ? `${adj.points > 0 ? "+" : "−"} ${Math.abs(adj.points)} extra` : ""}
                      </span>
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-700">Motivo del ajuste (opcional)</Label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ej. Sanción por alineación indebida, partido ganado por default…"
                      className="mt-1 bg-white"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {hasAdj && (
                      <Button
                        variant="outline"
                        disabled={saving}
                        onClick={() => {
                          if (!confirm("¿Quitar todos los ajustes de este equipo?")) return
                          setAdj(EMPTY_ADJ)
                          setNote("")
                          saveAdjustment(EMPTY_ADJ, "")
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Quitar ajustes
                      </Button>
                    )}
                    <Button
                      disabled={saving || !dirtyAdj}
                      onClick={() => saveAdjustment(adj, note)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Guardar en la tabla
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="partidos" className="space-y-3 pt-2">
              <p className="text-xs text-gray-500">
                Un partido solo cuenta en la tabla si está <b>Finalizado</b>, marcado <b>En tabla</b> y en la categoría
                del equipo ({getCategoryLabel(team.category)}).
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">J</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Partido</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-center">En tabla</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.games.map((g) =>
                      editingGame?.id === g.id ? (
                        <tr key={g.id} className="bg-amber-50">
                          <td colSpan={6} className="p-3">
                            <div className="grid gap-3 md:grid-cols-4">
                              <div className="md:col-span-2">
                                <Label className="text-xs">Local</Label>
                                <select
                                  className={selectClass}
                                  value={editingGame.home_team}
                                  onChange={(e) => setEditingGame({ ...editingGame, home_team: e.target.value })}
                                >
                                  {!rivals.includes(editingGame.home_team) && (
                                    <option value={editingGame.home_team}>{editingGame.home_team} (no existe)</option>
                                  )}
                                  {rivals.map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs">Visitante</Label>
                                <select
                                  className={selectClass}
                                  value={editingGame.away_team}
                                  onChange={(e) => setEditingGame({ ...editingGame, away_team: e.target.value })}
                                >
                                  {!rivals.includes(editingGame.away_team) && (
                                    <option value={editingGame.away_team}>{editingGame.away_team} (no existe)</option>
                                  )}
                                  {rivals.map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Marcador local</Label>
                                <Input
                                  type="number"
                                  value={editingGame.home_score ?? ""}
                                  onChange={(e) =>
                                    setEditingGame({
                                      ...editingGame,
                                      home_score: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Marcador visitante</Label>
                                <Input
                                  type="number"
                                  value={editingGame.away_score ?? ""}
                                  onChange={(e) =>
                                    setEditingGame({
                                      ...editingGame,
                                      away_score: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Estado</Label>
                                <select
                                  className={selectClass}
                                  value={editingGame.status || "programado"}
                                  onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value })}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                  {editingGame.status && !STATUS_OPTIONS.some((s) => s.value === editingGame.status) && (
                                    <option value={editingGame.status}>{editingGame.status}</option>
                                  )}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Categoría del partido</Label>
                                <select
                                  className={selectClass}
                                  value={editingGame.category || ""}
                                  onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                                >
                                  {editingGame.category &&
                                    !CATEGORY_OPTIONS.some((c) => c.value === editingGame.category) && (
                                      <option value={editingGame.category}>{editingGame.category}</option>
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
                                  value={editingGame.jornada ?? ""}
                                  onChange={(e) =>
                                    setEditingGame({
                                      ...editingGame,
                                      jornada: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Fecha</Label>
                                <Input
                                  type="date"
                                  value={editingGame.game_date}
                                  onChange={(e) => setEditingGame({ ...editingGame, game_date: e.target.value })}
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Hora</Label>
                                <Input
                                  type="time"
                                  value={(editingGame.game_time || "").slice(0, 5)}
                                  onChange={(e) => setEditingGame({ ...editingGame, game_time: e.target.value })}
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Campo</Label>
                                <Input
                                  value={editingGame.field || ""}
                                  onChange={(e) => setEditingGame({ ...editingGame, field: e.target.value })}
                                  className="bg-white"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-sm text-gray-800 md:col-span-2 cursor-pointer">
                                <Checkbox
                                  checked={editingGame.counts_toggle}
                                  onCheckedChange={(v) => setEditingGame({ ...editingGame, counts_toggle: v === true })}
                                />
                                Cuenta en tabla (si no, queda como amistoso)
                              </label>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingGame(null)} disabled={saving}>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveGame}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                Guardar partido
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{g.jornada ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {formatDate(g.game_date)}
                            <span className="block text-xs text-gray-400">
                              {(g.game_time || "").slice(0, 5)} {g.field || ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-900">
                            <span className={g.is_home ? "font-semibold" : ""}>{g.home_team}</span>
                            <span className="mx-2 font-mono">
                              {g.home_score ?? "–"} - {g.away_score ?? "–"}
                            </span>
                            <span className={!g.is_home ? "font-semibold" : ""}>{g.away_team}</span>
                            {g.category !== team.category && (
                              <span className="block text-xs text-purple-600">{getCategoryLabel(g.category)}</span>
                            )}
                            {(g.match_type === "amistoso" || g.game_type === "friendly") && (
                              <span className="block text-xs text-gray-500">Amistoso</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{g.status || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {g.counts ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Editar partido"
                                disabled={saving}
                                onClick={() => setEditingGame({ ...g, counts_toggle: markedForTable(g) })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                title="Borrar partido"
                                disabled={saving}
                                onClick={() => deleteGame(g)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                    {!detail.games.length && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          Este equipo no tiene partidos en la temporada activa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="equipo" className="space-y-4 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-700">Nombre</Label>
                  <Input
                    value={teamForm.name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="mt-1 bg-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Si lo cambias, también se renombran sus partidos.</p>
                </div>
                <div>
                  <Label className="text-gray-700">Categoría</Label>
                  <select
                    className={`mt-1 ${selectClass}`}
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
                  <p className="mt-1 text-xs text-gray-500">
                    Sus partidos ya jugados se quedan en su categoría; edítalos en "Partidos" si deben contar en la nueva.
                  </p>
                </div>
                <div>
                  <Label className="text-gray-700">Estado</Label>
                  <select
                    className={`mt-1 ${selectClass}`}
                    value={teamForm.status || "active"}
                    onChange={(e) => setTeamForm({ ...teamForm, status: e.target.value })}
                  >
                    <option value="active">Activo (sale en la tabla)</option>
                    <option value="inactive">Inactivo (no sale en la tabla)</option>
                    {teamForm.status && !["active", "inactive"].includes(teamForm.status) && (
                      <option value={teamForm.status}>{teamForm.status}</option>
                    )}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <Label className="text-gray-700">Color 1</Label>
                    <Input
                      type="color"
                      value={teamForm.color1 || "#3B82F6"}
                      onChange={(e) => setTeamForm({ ...teamForm, color1: e.target.value })}
                      className="mt-1 h-10 w-20 p-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Color 2</Label>
                    <Input
                      type="color"
                      value={teamForm.color2 || "#1E40AF"}
                      onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                      className="mt-1 h-10 w-20 p-1"
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
                <div className="md:col-span-2">
                  <Label className="text-gray-700">URL del logo</Label>
                  <Input
                    value={teamForm.logo_url || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Capitán</Label>
                  <Input
                    value={teamForm.captain_name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, captain_name: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Teléfono del capitán</Label>
                  <Input
                    value={teamForm.captain_phone || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, captain_phone: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Entrenador</Label>
                  <Input
                    value={teamForm.coach_name || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, coach_name: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Teléfono del entrenador</Label>
                  <Input
                    value={teamForm.coach_phone || ""}
                    onChange={(e) => setTeamForm({ ...teamForm, coach_phone: e.target.value })}
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveTeam} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Guardar equipo
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
