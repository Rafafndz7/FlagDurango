"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, Loader2, Plus, Trash2, AlertTriangle, RefreshCw } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

type Team = { id?: number | string; name: string; category?: string }

type Row = { key: string; jersey_number: string; name: string; position: string }

type ExistingPlayer = {
  id: number
  name: string
  jersey_number?: number | null
  position?: string | null
  reason?: string
}

type Conflict = {
  incoming: { name: string; jersey_number: number | null; position: string | null }
  existing: ExistingPlayer[]
  reason: string
}

const POSITIONS = ["QB", "RB", "WR", "TE", "RU", "LB", "DB", "CB", "C", ""]

function parsePaste(text: string): Row[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(\d+)\s*[,;\t ]+\s*(.+)$/) || line.match(/^(\d+)\s+(.+)$/)
      if (m) {
        return {
          key: `p-${Date.now()}-${i}`,
          jersey_number: m[1],
          name: m[2].trim(),
          position: "",
        }
      }
      return {
        key: `p-${Date.now()}-${i}`,
        jersey_number: "",
        name: line,
        position: "",
      }
    })
}

function findRosterDuplicates(players: ExistingPlayer[]): ExistingPlayer[] {
  const byJersey = new Map<number, ExistingPlayer[]>()
  const byName = new Map<string, ExistingPlayer[]>()
  for (const p of players) {
    if (p.jersey_number != null && p.jersey_number !== undefined) {
      const j = Number(p.jersey_number)
      if (!byJersey.has(j)) byJersey.set(j, [])
      byJersey.get(j)!.push(p)
    }
    const key = String(p.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(p)
  }
  const out: ExistingPlayer[] = []
  const seen = new Set<number>()
  for (const [, arr] of byJersey) {
    if (arr.length > 1) {
      for (const p of arr) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          out.push({ ...p, reason: `número #${p.jersey_number} repetido` })
        }
      }
    }
  }
  for (const [, arr] of byName) {
    if (arr.length > 1) {
      for (const p of arr) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          out.push({ ...p, reason: "nombre repetido" })
        }
      }
    }
  }
  return out
}

export default function AdminBulkRoster({
  teams = [],
  onDone,
}: {
  teams?: Team[]
  onDone?: () => void
}) {
  const [teamId, setTeamId] = useState("")
  const [paste, setPaste] = useState("")
  const [rows, setRows] = useState<Row[]>([
    { key: "1", jersey_number: "", name: "", position: "" },
    { key: "2", jersey_number: "", name: "", position: "" },
    { key: "3", jersey_number: "", name: "", position: "" },
  ])
  const [saving, setSaving] = useState(false)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [existing, setExisting] = useState<ExistingPlayer[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [selectedDupes, setSelectedDupes] = useState<number[]>([])

  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.id) === String(teamId)),
    [teams, teamId],
  )

  const rosterDuplicates = useMemo(() => findRosterDuplicates(existing), [existing])

  const loadRoster = useCallback(async (tid: string) => {
    if (!tid) {
      setExisting([])
      setConflicts([])
      setSelectedDupes([])
      return
    }
    setLoadingRoster(true)
    try {
      const res = await fetch(`/api/players?team_id=${tid}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success) setExisting(data.data || [])
      else setExisting([])
      setConflicts([])
      setSelectedDupes([])
    } finally {
      setLoadingRoster(false)
    }
  }, [])

  useEffect(() => {
    loadRoster(teamId)
  }, [teamId, loadRoster])

  const applyPaste = () => {
    const parsed = parsePaste(paste)
    if (parsed.length === 0) {
      alert("Pega una lista: una línea por jugador. Ej: 12 Juan Pérez")
      return
    }
    setRows(parsed)
    setPaste("")
  }

  const addRow = () =>
    setRows((prev) => [...prev, { key: `${Date.now()}`, jersey_number: "", name: "", position: "" }])

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key))

  const toggleDupe = (id: number) => {
    setSelectedDupes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const deleteSelected = async () => {
    if (selectedDupes.length === 0) {
      alert("Selecciona jugadores a borrar")
      return
    }
    if (!confirm(`¿Borrar ${selectedDupes.length} jugador(es) del roster?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/players?ids=${selectedDupes.join(",")}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error al borrar")
        return
      }
      setSelectedDupes([])
      await loadRoster(teamId)
      onDone?.()
      setResult(data.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteConflictExisting = async (ids: number[]) => {
    if (!ids.length) return
    if (!confirm(`¿Borrar ${ids.length} jugador(es) existente(s) para poder cargar el nuevo?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/players?ids=${ids.join(",")}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error al borrar")
        return
      }
      await loadRoster(teamId)
      onDone?.()
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!teamId) {
      alert("Selecciona un equipo")
      return
    }
    const players = rows
      .map((r) => ({
        name: r.name.trim(),
        jersey_number: r.jersey_number.trim() || null,
        position: r.position || null,
      }))
      .filter((p) => p.name)

    if (players.length === 0) {
      alert("Agrega al menos un nombre")
      return
    }

    setSaving(true)
    setResult(null)
    setConflicts([])
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, team_id: Number(teamId), players }),
      })
      const data = await res.json()
      setResult(data.message || (data.success ? "Listo" : "Error"))
      if (data.conflicts?.length) setConflicts(data.conflicts)
      if (data.success && data.created > 0) {
        // quitar de la tabla los que sí se crearon
        const createdNames = new Set(
          (data.data || []).map((p: any) =>
            String(p.name)
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim(),
          ),
        )
        setRows((prev) =>
          prev.filter((r) => {
            const key = r.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim()
            return !createdNames.has(key)
          }),
        )
        await loadRoster(teamId)
        onDone?.()
      }
      if (!data.success && !data.conflicts?.length) {
        alert(data.message || "Error")
      }
    } finally {
      setSaving(false)
    }
  }

  const conflictIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of conflicts) for (const e of c.existing) ids.add(e.id)
    return [...ids]
  }, [conflicts])

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Registro rápido de roster
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Elige el equipo y pega o escribe muchos jugadores. Si hay duplicados, aparecen abajo para
          borrarlos y luego guardar los nuevos.
        </p>

        <div>
          <Label>Equipo</Label>
          <select
            className="w-full mt-1 rounded-md border border-gray-300 p-2 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {teams.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>
                {t.name} ({getCategoryLabel(t.category)})
              </option>
            ))}
          </select>
          {selectedTeam && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-600">{selectedTeam.name}</Badge>
              <Badge variant="outline">{existing.length} en roster</Badge>
              <Button size="sm" variant="outline" onClick={() => loadRoster(teamId)} disabled={loadingRoster}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingRoster ? "animate-spin" : ""}`} />
                Recargar roster
              </Button>
            </div>
          )}
        </div>

        {rosterDuplicates.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Duplicados ya en el roster ({rosterDuplicates.length})
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {rosterDuplicates.map((p) => (
                <label key={p.id} className="flex items-center gap-3 text-sm bg-white border rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedDupes.includes(p.id)}
                    onChange={() => toggleDupe(p.id)}
                  />
                  <span className="font-medium text-gray-900">
                    #{p.jersey_number ?? "—"} {p.name}
                  </span>
                  <span className="text-amber-700 text-xs">{p.reason}</span>
                  <span className="text-gray-400 text-xs ml-auto">id {p.id}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300"
              disabled={saving || selectedDupes.length === 0}
              onClick={deleteSelected}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Borrar seleccionados ({selectedDupes.length})
            </Button>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
            <h4 className="font-semibold text-red-900 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Conflictos al guardar ({conflicts.length}) — borra el viejo y vuelve a guardar
            </h4>
            {conflicts.map((c, i) => (
              <div key={i} className="bg-white border rounded-lg p-3 text-sm space-y-2">
                <p className="text-gray-900">
                  Nuevo: <strong>#{c.incoming.jersey_number ?? "—"} {c.incoming.name}</strong>
                </p>
                <p className="text-red-700 text-xs">{c.reason}</p>
                <div className="space-y-1">
                  {c.existing.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2">
                      <span>
                        Existe: #{e.jersey_number ?? "—"} {e.name}{" "}
                        <span className="text-gray-400">(id {e.id})</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={saving}
                        onClick={() => deleteConflictExisting([e.id])}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Borrar este
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {conflictIds.length > 1 && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={saving}
                onClick={() => deleteConflictExisting(conflictIds)}
              >
                Borrar todos los conflictivos ({conflictIds.length})
              </Button>
            )}
          </div>
        )}

        <div>
          <Label>Pegar lista (opcional)</Label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm min-h-[100px]"
            placeholder={"12 Juan Pérez\n7 María López\n21 Carlos Ruiz"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <Button size="sm" variant="outline" className="mt-2" onClick={applyPaste}>
            Cargar pegado a la tabla
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
            <div className="col-span-2">#</div>
            <div className="col-span-6">Nombre</div>
            <div className="col-span-3">Posición</div>
            <div className="col-span-1" />
          </div>
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-2"
                placeholder="12"
                value={r.jersey_number}
                onChange={(e) => updateRow(r.key, { jersey_number: e.target.value })}
              />
              <Input
                className="col-span-6"
                placeholder="Nombre completo"
                value={r.name}
                onChange={(e) => updateRow(r.key, { name: e.target.value })}
              />
              <select
                className="col-span-3 rounded-md border border-gray-300 p-2 text-sm"
                value={r.position}
                onChange={(e) => updateRow(r.key, { position: e.target.value })}
              >
                <option value="">—</option>
                {POSITIONS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="col-span-1 text-red-600"
                onClick={() => removeRow(r.key)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={addRow}>
            <Plus className="w-4 h-4 mr-1" />
            Fila
          </Button>
          <Button onClick={save} disabled={saving || !teamId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
            Guardar nuevos ({rows.filter((r) => r.name.trim()).length})
          </Button>
        </div>

        {result && <p className="text-sm text-gray-700 bg-gray-50 border rounded p-2">{result}</p>}
      </CardContent>
    </Card>
  )
}
