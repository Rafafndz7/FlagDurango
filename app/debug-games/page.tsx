"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Save, Edit, X } from 'lucide-react'

type Team = {
  id: number
  name: string
  category: string
}

type Game = {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time: string
  venue: string | null
  field: string | null
  category: string
  referee1?: string | null
  referee2?: string | null
  status: string
  match_type?: string | null
  mvp?: string | null
  home_score?: number | null
  away_score?: number | null
}

const categories = [
  { value: "varonil-gold", label: "Varonil Gold" },
  { value: "varonil-silver", label: "Varonil Silver" },
  { value: "femenil-gold", label: "Femenil Gold" },
  { value: "femenil-silver", label: "Femenil Silver" },
  { value: "femenil-cooper-a", label: "Femenil Cooper A" },
  { value: "femenil-cooper-b", label: "Femenil Cooper B" },
  { value: "mixto-gold", label: "Mixto Gold" },
  { value: "mixto-silver", label: "Mixto Silver" },
]

const statuses = ["programado", "en_vivo", "finalizado"]
const matchTypes = ["jornada", "amistoso", "playoffs", "otro"]

function numOrEmpty(v: number | null | undefined) {
  return v === null || v === undefined ? "" : String(v)
}

function normalizeCategory(value: unknown): string {
  if (value === undefined || value === null) return ""
  return String(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export default function DebugGamesPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    category: "varonil-gold",
    home_team: "",
    away_team: "",
    game_date: "",
    game_time: "",
    venue: "",
    field: "",
    referee1: "",
    referee2: "",
    status: "programado",
    home_score: "",
    away_score: "",
    match_type: "jornada",
    mvp: "",
  })

  const filteredTeams = useMemo(
    () => teams.filter((t) => normalizeCategory(t.category) === normalizeCategory(form.category)),
    [teams, form.category]
  )

  const [editId, setEditId] = useState<number | null>(null)
  const [edit, setEdit] = useState<any>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [teamsRes, gamesRes] = await Promise.all([fetch("/api/teams"), fetch("/api/games")])
        const [teamsJson, gamesJson] = await Promise.all([teamsRes.json(), gamesRes.json()])
        if (teamsJson.success) setTeams(teamsJson.data || [])
        if (gamesJson.success) setGames(gamesJson.data || [])
        if (!teamsJson.success) throw new Error(teamsJson.message || "Error cargando equipos")
        if (!gamesJson.success) throw new Error(gamesJson.message || "Error cargando partidos")
      } catch (e: any) {
        setError(e.message || "Error cargando datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const payload: any = {
        home_team: form.home_team,
        away_team: form.away_team,
        game_date: form.game_date,
        game_time: form.game_time,
        venue: form.venue,
        field: form.field,
        category: form.category, // si no coincide, el API la valida/ajusta
        referee1: form.referee1,
        referee2: form.referee2,
        status: form.status,
        match_type: form.match_type,
      }
      // Enviar score solo si es número válido
      if (form.home_score !== "") {
        const n = Number(form.home_score)
        payload.home_score = Number.isFinite(n) ? n : null
      }
      if (form.away_score !== "") {
        const n = Number(form.away_score)
        payload.away_score = Number.isFinite(n) ? n : null
      }
      if (form.mvp.trim()) payload.mvp = form.mvp.trim()

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || "No se pudo crear el partido")
      }
      setGames((prev) => [data.data, ...prev])
      // limpiar
      setForm((f) => ({
        ...f,
        home_team: "",
        away_team: "",
        game_date: "",
        game_time: "",
        venue: "",
        field: "",
        referee1: "",
        referee2: "",
        home_score: "",
        away_score: "",
        mvp: "",
      }))
    } catch (e: any) {
      setError(e.message || "Error creando partido")
    }
  }

  const startEdit = (g: Game) => {
    setEditId(g.id)
    setEdit({
      id: g.id,
      status: g.status,
      home_score: numOrEmpty(g.home_score),
      away_score: numOrEmpty(g.away_score),
      mvp: g.mvp || "",
      match_type: g.match_type || "jornada",
      game_date: g.game_date,
      game_time: g.game_time,
      venue: g.venue || "",
      field: g.field || "",
      referee1: g.referee1 || "",
      referee2: g.referee2 || "",
      category: g.category,
      home_team: g.home_team,
      away_team: g.away_team,
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEdit({})
  }

  const saveEdit = async () => {
    setError(null)
    try {
      const payload: any = { ...edit }
      // Sanitizar números
      if (payload.home_score !== undefined) {
        payload.home_score = payload.home_score === "" ? null : Number(payload.home_score)
      }
      if (payload.away_score !== undefined) {
        payload.away_score = payload.away_score === "" ? null : Number(payload.away_score)
      }
      const res = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || "No se pudo actualizar el partido")
      }
      setGames((prev) => prev.map((g) => (g.id === data.data.id ? data.data : g)))
      cancelEdit()
    } catch (e: any) {
      setError(e.message || "Error actualizando partido")
    }
  }

  const deleteGame = async (id: number) => {
    setError(null)
    try {
      const res = await fetch(`/api/games?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "No se pudo eliminar")
      setGames((prev) => prev.filter((g) => g.id !== id))
    } catch (e: any) {
      setError(e.message || "Error eliminando partido")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Debug Partidos</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Crear partido</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleCreate}>
              <div>
                <Label>Categoría</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Equipo Local</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.home_team}
                  onChange={(e) => setForm({ ...form, home_team: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Equipo Visitante</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.away_team}
                  onChange={(e) => setForm({ ...form, away_team: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.game_date} onChange={(e) => setForm({ ...form, game_date: e.target.value })} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.game_time} onChange={(e) => setForm({ ...form, game_time: e.target.value })} />
              </div>
              <div>
                <Label>Sede (venue)</Label>
                <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              </div>
              <div>
                <Label>Campo (field)</Label>
                <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
              </div>
              <div>
                <Label>Árbitro 1</Label>
                <Input value={form.referee1} onChange={(e) => setForm({ ...form, referee1: e.target.value })} />
              </div>
              <div>
                <Label>Árbitro 2</Label>
                <Input value={form.referee2} onChange={(e) => setForm({ ...form, referee2: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Tipo de partido</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={form.match_type}
                  onChange={(e) => setForm({ ...form, match_type: e.target.value })}
                >
                  {matchTypes.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
                </select>
              </div>
              <div>
                <Label>Marcador Local</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.home_score}
                  onChange={(e) => setForm({ ...form, home_score: e.target.value })}
                />
              </div>
              <div>
                <Label>Marcador Visitante</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.away_score}
                  onChange={(e) => setForm({ ...form, away_score: e.target.value })}
                />
              </div>
              <div>
                <Label>MVP (opcional)</Label>
                <Input value={form.mvp} onChange={(e) => setForm({ ...form, mvp: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" className="w-full">Crear</Button>
              </div>
            </form>
            {error && <div className="mt-4 p-2 text-sm bg-red-50 text-red-700 rounded">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Partidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {games.map((g) => (
              <div key={g.id} className="p-4 rounded border bg-white">
                {editId === g.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Estado</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={edit.status}
                        onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={edit.match_type}
                        onChange={(e) => setEdit({ ...edit, match_type: e.target.value })}
                      >
                        {matchTypes.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={edit.game_date} onChange={(e) => setEdit({ ...edit, game_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Hora</Label>
                      <Input type="time" value={edit.game_time} onChange={(e) => setEdit({ ...edit, game_time: e.target.value })} />
                    </div>
                    <div>
                      <Label>Sede</Label>
                      <Input value={edit.venue} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} />
                    </div>
                    <div>
                      <Label>Campo</Label>
                      <Input value={edit.field} onChange={(e) => setEdit({ ...edit, field: e.target.value })} />
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={edit.category}
                        onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                      >
                        {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Local</Label>
                      <Input value={edit.home_team} onChange={(e) => setEdit({ ...edit, home_team: e.target.value })} />
                    </div>
                    <div>
                      <Label>Visitante</Label>
                      <Input value={edit.away_team} onChange={(e) => setEdit({ ...edit, away_team: e.target.value })} />
                    </div>
                    <div>
                      <Label>Marcador Local</Label>
                      <Input
                        type="number"
                        min={0}
                        value={edit.home_score}
                        onChange={(e) => setEdit({ ...edit, home_score: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Marcador Visitante</Label>
                      <Input
                        type="number"
                        min={0}
                        value={edit.away_score}
                        onChange={(e) => setEdit({ ...edit, away_score: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>MVP</Label>
                      <Input value={edit.mvp} onChange={(e) => setEdit({ ...edit, mvp: e.target.value })} />
                    </div>
                    <div className="md:col-span-4 flex gap-2">
                      <Button onClick={saveEdit} className="flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</Button>
                      <Button variant="outline" onClick={cancelEdit} className="flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{g.category}</Badge>
                      <Badge>{g.status}</Badge>
                      {g.match_type && <Badge variant="outline">{g.match_type}</Badge>}
                    </div>
                    <div className="mt-2 font-semibold">{g.home_team} vs {g.away_team}</div>
                    <div className="text-sm text-gray-600">
                      {g.game_date} {g.game_time} • {g.venue || "-"} / {g.field || "-"}
                    </div>
                    <div className="text-sm">
                      Marcador: {g.home_score ?? "-"} - {g.away_score ?? "-"} {g.mvp ? `• MVP: ${g.mvp}` : ""}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" onClick={() => startEdit(g)} className="flex items-center gap-2">
                        <Edit className="w-4 h-4" /> Editar
                      </Button>
                      <Button variant="destructive" onClick={() => deleteGame(g.id)} className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {games.length === 0 && <div className="text-sm text-gray-500">No hay partidos.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
