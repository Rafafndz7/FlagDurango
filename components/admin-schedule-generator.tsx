"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Trash2, Upload, RefreshCw, Share2, Loader2 } from "lucide-react"
import { TEAM_CATEGORY_OPTIONS, getCategoryLabel } from "@/lib/categories"
import { SCHEDULE_BLOCKS, SCHEDULE_FIELDS, getAllowedHours, formatFieldName } from "@/lib/schedule-slots"

type Team = { id?: number | string; name: string; category?: string }
type DraftGame = {
  id: number
  home_team: string
  away_team: string
  game_date?: string
  game_time?: string
  field?: string
  category?: string
  is_draft?: boolean
  allow_shared_slot?: boolean
  draft_notes?: string
}

type MatchRow = {
  key: string
  home_team: string
  away_team: string
  category: string
  game_time: string
  field: string
  allow_shared_slot: boolean
  draft_notes: string
}

type SlotRequest = {
  id: number
  team_name?: string
  requested_by_name?: string
  game_date: string
  game_time: string
  field?: string
  reason?: string
  request_type: string
  status: string
  related_game_id?: number
}

export default function AdminScheduleGenerator({
  teams = [],
  seasons = [],
  activeSeasonId = "",
}: {
  teams?: Team[]
  seasons?: { id: string; name?: string; is_active?: boolean }[]
  activeSeasonId?: string
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [jornada, setJornada] = useState("")
  const [venue, setVenue] = useState("Deportivo Tapias")
  const [seasonId, setSeasonId] = useState(activeSeasonId)
  const [rows, setRows] = useState<MatchRow[]>([])
  const [drafts, setDrafts] = useState<DraftGame[]>([])
  const [requests, setRequests] = useState<SlotRequest[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reqForm, setReqForm] = useState({
    team_name: "",
    requested_by_name: "",
    game_time: "08:00",
    field: "A",
    request_type: "occupy",
    reason: "",
    related_game_id: "",
  })

  const [filterDraftsByDate, setFilterDraftsByDate] = useState(false)

  useEffect(() => {
    if (activeSeasonId) setSeasonId(activeSeasonId)
  }, [activeSeasonId])

  const teamsByCategory = useMemo(() => {
    const map: Record<string, Team[]> = {}
    for (const t of teams) {
      const c = t.category || "sin-cat"
      if (!map[c]) map[c] = []
      map[c].push(t)
    }
    return map
  }, [teams])

  const load = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      // 1) Todos los borradores de la temporada (sin filtrar fecha — así salen los del SQL J2)
      const draftParams = new URLSearchParams({ drafts: "1" })
      if (seasonId) draftParams.set("season", seasonId)

      // 2) Opcional: ocupación del día seleccionado
      const dayParams = new URLSearchParams({ date })
      if (seasonId) dayParams.set("season", seasonId)

      const [draftsRes, dayRes, reqRes] = await Promise.all([
        fetch(`/api/games/schedule-generator?${draftParams}`, { cache: "no-store" }),
        fetch(`/api/games/schedule-generator?${dayParams}`, { cache: "no-store" }),
        fetch("/api/schedule-requests?status=pending", { cache: "no-store" }),
      ])
      const draftsJson = await draftsRes.json()
      const dayJson = await dayRes.json()
      const req = await reqRes.json()
      if (draftsJson.needs_migration || req.needs_migration) {
        setMessage("Ejecuta en Supabase: scripts/2026-09-schedule-drafts.sql")
      }
      if (draftsJson.success) {
        let list = (draftsJson.data || []).filter((g: DraftGame) => g.is_draft)
        if (filterDraftsByDate && date) {
          list = list.filter((g: DraftGame) => String(g.game_date || "").slice(0, 10) === date)
        }
        setDrafts(list)
        if (list.length === 0 && !filterDraftsByDate) {
          setMessage("No hay partidos en borrador. Si corriste el SQL J2, verifica temporada activa y is_draft=true.")
        }
      } else if (draftsJson.message) {
        setMessage(draftsJson.message)
      }
      if (req.success) setRequests(req.data || [])
      void dayJson
    } finally {
      setLoading(false)
    }
  }, [date, seasonId, filterDraftsByDate])

  useEffect(() => {
    load()
  }, [load])

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        home_team: "",
        away_team: "",
        category: "femenil-cooper-a",
        game_time: "",
        field: "",
        allow_shared_slot: false,
        draft_notes: "",
      },
    ])
  }

  const updateRow = (key: string, patch: Partial<MatchRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key))

  const generate = async () => {
    if (!date || rows.length === 0) {
      alert("Agrega fecha y al menos un partido")
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/games/schedule-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_date: date,
          venue,
          jornada: jornada || null,
          season_id: seasonId || undefined,
          as_draft: true,
          auto_assign: true,
          matches: rows.map((r) => ({
            home_team: r.home_team,
            away_team: r.away_team,
            category: r.category,
            game_time: r.game_time || undefined,
            field: r.field || undefined,
            allow_shared_slot: r.allow_shared_slot,
            draft_notes: r.draft_notes || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.message || "Error al generar")
        if (data.warnings?.length) alert(data.warnings.join("\n"))
        return
      }
      setMessage(data.message)
      if (data.warnings?.length) console.warn(data.warnings)
      setRows([])
      await load()
    } finally {
      setSaving(false)
    }
  }

  const publishSelected = async () => {
    if (selected.length === 0) {
      alert("Selecciona borradores a publicar")
      return
    }
    if (!confirm(`¿Publicar ${selected.length} partido(s) al calendario?`)) return
    setSaving(true)
    try {
      const res = await fetch("/api/games/schedule-generator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", ids: selected }),
      })
      const data = await res.json()
      alert(data.message || (data.success ? "Publicado" : "Error"))
      setSelected([])
      await load()
    } finally {
      setSaving(false)
    }
  }

  const publishAllDay = async () => {
    if (!confirm(`¿Publicar TODOS los borradores del ${date}?`)) return
    setSaving(true)
    try {
      const res = await fetch("/api/games/schedule-generator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_all_drafts_for_date",
          game_date: date,
          season_id: seasonId,
        }),
      })
      const data = await res.json()
      alert(data.message || "Listo")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const publishAllDrafts = async () => {
    if (!confirm(`¿Publicar TODOS los ${drafts.length} borradores de la temporada?`)) return
    setSaving(true)
    try {
      const res = await fetch("/api/games/schedule-generator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_all_drafts",
          season_id: seasonId,
        }),
      })
      const data = await res.json()
      alert(data.message || "Listo")
      setSelected([])
      await load()
    } finally {
      setSaving(false)
    }
  }

  const adjustGame = async (g: DraftGame) => {
    const time = prompt("Nueva hora (HH:MM)", g.game_time || "08:00")
    if (time === null) return
    const field = prompt("Campo (A-F)", (g.field || "A").replace(/campo\s*/i, "").trim())
    if (field === null) return
    const share = confirm("¿Permitir compartir cupo (coach/jugador en dos partidos)?")
    setSaving(true)
    try {
      await fetch("/api/games/schedule-generator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          id: g.id,
          game_time: time,
          field,
          allow_shared_slot: share,
        }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const createRequest = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/schedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reqForm,
          game_date: date,
          field: reqForm.field,
          related_game_id: reqForm.related_game_id ? Number(reqForm.related_game_id) : null,
          season_id: seasonId,
          requested_by_role: "captain",
        }),
      })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error")
      else {
        setReqForm({
          team_name: "",
          requested_by_name: "",
          game_time: "08:00",
          field: "A",
          request_type: "occupy",
          reason: "",
          related_game_id: "",
        })
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  const resolveRequest = async (id: number, status: "approved" | "rejected") => {
    setSaving(true)
    try {
      await fetch("/api/schedule-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calendar className="w-5 h-5" />
            Generador de partidos (borrador → publicar)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-gray-700 space-y-1">
            <p>
              <strong>Horarios:</strong> Cooper 8:00/9:00 · Femenil 10:00/11:00 · Mixto 12:00/13:00 · Varonil
              14:00/15:00
            </p>
            <p>
              <strong>Campos:</strong> {SCHEDULE_FIELDS.map((f) => formatFieldName(f)).join(", ")}
            </p>
            <p>Los partidos se guardan como <Badge className="bg-amber-500">borrador</Badge> y no salen al
              público hasta que los aceptes/publicques.</p>
          </div>

          {message && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{message}</p>}

          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Jornada</Label>
              <Input value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="3" />
            </div>
            <div>
              <Label>Sede</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <Label>Temporada</Label>
              <select
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                    {s.is_active ? " (activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Partidos a generar</h3>
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>

            {rows.map((r) => {
              const catTeams = teamsByCategory[r.category] || teams
              const hours = getAllowedHours(r.category)
              return (
                <div key={r.key} className="grid md:grid-cols-7 gap-2 items-end border rounded-lg p-3 bg-gray-50">
                  <div>
                    <Label className="text-xs">Categoría</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={r.category}
                      onChange={(e) => updateRow(r.key, { category: e.target.value, home_team: "", away_team: "" })}
                    >
                      {TEAM_CATEGORY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                      <option value="varonil-libre">Varonil Libre</option>
                      <option value="mixto-recreativo">Mixto Recreativo</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Local</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={r.home_team}
                      onChange={(e) => updateRow(r.key, { home_team: e.target.value })}
                    >
                      <option value="">—</option>
                      {catTeams.map((t) => (
                        <option key={String(t.id) + t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Visitante</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={r.away_team}
                      onChange={(e) => updateRow(r.key, { away_team: e.target.value })}
                    >
                      <option value="">—</option>
                      {catTeams.map((t) => (
                        <option key={String(t.id) + t.name + "-a"} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Hora (opc.)</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={r.game_time}
                      onChange={(e) => updateRow(r.key, { game_time: e.target.value })}
                    >
                      <option value="">Auto {hours.join("/")}</option>
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Campo (opc.)</Label>
                    <select
                      className="w-full rounded-md border p-2 text-sm"
                      value={r.field}
                      onChange={(e) => updateRow(r.key, { field: e.target.value })}
                    >
                      <option value="">Auto A–F</option>
                      {SCHEDULE_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          Campo {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs pb-2">
                    <input
                      type="checkbox"
                      checked={r.allow_shared_slot}
                      onChange={(e) => updateRow(r.key, { allow_shared_slot: e.target.checked })}
                    />
                    Compartir cupo
                  </label>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeRow(r.key)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}

            {rows.length === 0 && (
              <p className="text-sm text-gray-500">Agrega partidos; la hora/campo se asignan solos según categoría.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={saving || rows.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Guardar como borrador
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center justify-between flex-wrap gap-2">
            <span>Borradores pendientes ({drafts.length})</span>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-normal text-gray-600">
                <input
                  type="checkbox"
                  checked={filterDraftsByDate}
                  onChange={(e) => setFilterDraftsByDate(e.target.checked)}
                />
                Solo fecha {date || "—"}
              </label>
              <Button size="sm" onClick={publishSelected} disabled={saving || selected.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="w-4 h-4 mr-1" />
                Publicar seleccionados
              </Button>
              <Button size="sm" variant="outline" onClick={publishAllDay} disabled={saving}>
                Publicar del día
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={publishAllDrafts} disabled={saving || drafts.length === 0}>
                Publicar todos los borradores
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando borradores…
            </p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay borradores{filterDraftsByDate ? ` el ${date}` : ""}. Tip: desactiva “Solo fecha” o pon la fecha del
              SQL (ej. 2026-09-27).
            </p>
          ) : (
            drafts.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(g.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)))
                    }
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {g.home_team} vs {g.away_team}
                    </p>
                    <p className="text-gray-600">
                      {String(g.game_date || "").slice(0, 10)} · {String(g.game_time || "").slice(0, 5)} · {g.field} ·{" "}
                      {getCategoryLabel(g.category)}
                      {g.allow_shared_slot ? " · cupo compartido" : ""}
                    </p>
                  </div>
                </label>
                <div className="flex gap-2">
                  <Badge className="bg-amber-500">Borrador</Badge>
                  <Button size="sm" variant="outline" onClick={() => adjustGame(g)}>
                    Ajustar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Solicitudes de horario (capitán / coach)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Registra si un capitán pide un horario ocupado, mover su partido, o juntarse en el mismo cupo porque es
            coach/jugador en dos equipos.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Equipo</Label>
              <Input
                value={reqForm.team_name}
                onChange={(e) => setReqForm({ ...reqForm, team_name: e.target.value })}
                placeholder="Nombre del equipo"
              />
            </div>
            <div>
              <Label>Capitán / solicitante</Label>
              <Input
                value={reqForm.requested_by_name}
                onChange={(e) => setReqForm({ ...reqForm, requested_by_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={reqForm.request_type}
                onChange={(e) => setReqForm({ ...reqForm, request_type: e.target.value })}
              >
                <option value="occupy">Ocupar horario</option>
                <option value="share">Compartir / juntar cupo</option>
                <option value="move">Mover partido</option>
              </select>
            </div>
            <div>
              <Label>Hora pedida</Label>
              <Input
                type="time"
                value={reqForm.game_time}
                onChange={(e) => setReqForm({ ...reqForm, game_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Campo</Label>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={reqForm.field}
                onChange={(e) => setReqForm({ ...reqForm, field: e.target.value })}
              >
                {SCHEDULE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    Campo {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>ID partido a mover (opc.)</Label>
              <Input
                value={reqForm.related_game_id}
                onChange={(e) => setReqForm({ ...reqForm, related_game_id: e.target.value })}
                placeholder="id del games"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Motivo</Label>
              <Input
                value={reqForm.reason}
                onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                placeholder="Ej. el coach también juega a las 10"
              />
            </div>
          </div>
          <Button onClick={createRequest} disabled={saving} variant="outline">
            Registrar solicitud
          </Button>

          <div className="space-y-2 pt-2">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">Sin solicitudes pendientes.</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {r.team_name || "Equipo"} · {r.request_type} · {String(r.game_date).slice(0, 10)}{" "}
                      {String(r.game_time).slice(0, 5)} {r.field || ""}
                    </p>
                    <p className="text-gray-600">
                      {r.requested_by_name}
                      {r.reason ? ` — ${r.reason}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 text-white" onClick={() => resolveRequest(r.id, "approved")}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => resolveRequest(r.id, "rejected")}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-gray-500 border-t pt-3">
            Bloques de referencia:{" "}
            {Object.entries(SCHEDULE_BLOCKS)
              .map(([k, b]) => `${b.label} ${b.hours.join("/")}`)
              .join(" · ")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
