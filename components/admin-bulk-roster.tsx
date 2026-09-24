"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, Loader2, Plus, Trash2 } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

type Team = { id?: number | string; name: string; category?: string }

type Row = { key: string; jersey_number: string; name: string; position: string }

const POSITIONS = ["QB", "RB", "WR", "TE", "RU", "LB", "DB", "CB", "C", ""]

function parsePaste(text: string): Row[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      // Formatos: "12 Juan Pérez" | "12,Juan Pérez" | "12\tJuan Pérez" | "Juan Pérez"
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
  const [result, setResult] = useState<string | null>(null)

  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.id) === String(teamId)),
    [teams, teamId],
  )

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
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, team_id: Number(teamId), players }),
      })
      const data = await res.json()
      setResult(data.message || (data.success ? "Listo" : "Error"))
      if (data.errors?.length) {
        console.warn(data.errors)
        alert(`${data.message}\n\nDetalles:\n${data.errors.slice(0, 8).join("\n")}`)
      } else if (data.success) {
        setRows([
          { key: `${Date.now()}-a`, jersey_number: "", name: "", position: "" },
          { key: `${Date.now()}-b`, jersey_number: "", name: "", position: "" },
        ])
        onDone?.()
      } else {
        alert(data.message || "Error")
      }
    } finally {
      setSaving(false)
    }
  }

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
          Elige el equipo y pega o escribe muchos jugadores de golpe. Formato por línea:{" "}
          <code className="bg-gray-100 px-1 rounded">12 Juan Pérez</code> o solo el nombre.
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
            <Badge className="mt-2 bg-blue-600">{selectedTeam.name}</Badge>
          )}
        </div>

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
            Guardar roster ({rows.filter((r) => r.name.trim()).length})
          </Button>
        </div>

        {result && <p className="text-sm text-gray-700 bg-gray-50 border rounded p-2">{result}</p>}
      </CardContent>
    </Card>
  )
}
