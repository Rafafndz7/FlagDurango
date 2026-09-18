"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, Plus, LogOut, RefreshCw, DollarSign, Users, Loader2 } from "lucide-react"
import { getCategoryLabel, TEAM_CATEGORY_OPTIONS } from "@/lib/categories"

type Referee = {
  id: number
  name: string
  phone?: string
  email?: string
  default_fee: number
  active: boolean
}

type Assignment = {
  id: number
  game_id: number
  referee_id: number
  role: string
  fee: number
  notes?: string
  referee_profiles?: Referee
}

type GameRow = {
  game: {
    id: number
    home_team: string
    away_team: string
    game_date: string
    game_time?: string
    category?: string
    venue?: string
    field?: string
    jornada?: string
    status?: string
  }
  assignments: Assignment[]
}

type Earning = {
  referee_id: number
  name: string
  total: number
  games: number
}

export default function ArbitrosPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null)
  const [refs, setRefs] = useState<Referee[]>([])
  const [rows, setRows] = useState<GameRow[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [refForm, setRefForm] = useState({ name: "", phone: "", default_fee: "300" })
  const [editingFee, setEditingFee] = useState<{ id: number; fee: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      if (!raw) {
        router.push("/login")
        return
      }
      const u = JSON.parse(raw)
      if (u.role !== "admin" && u.role !== "referee_coordinator") {
        router.push("/")
        return
      }
      setUser(u)
    } catch {
      router.push("/login")
    }
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterDate) params.set("date", filterDate)
      if (filterCategory) params.set("category", filterCategory)
      if (unassignedOnly) params.set("unassigned", "1")

      const [refsRes, assignRes] = await Promise.all([
        fetch("/api/referee-profiles?active=1", { cache: "no-store" }),
        fetch(`/api/game-referee-assignments?${params.toString()}`, { cache: "no-store" }),
      ])
      const refsData = await refsRes.json()
      const assignData = await assignRes.json()
      if (refsData.success) setRefs(refsData.data || [])
      if (assignData.success) {
        setRows(assignData.data || [])
        setEarnings(assignData.earnings || [])
      }
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterCategory, unassignedOnly])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const logout = async () => {
    localStorage.removeItem("user")
    document.cookie = "user=; path=/; max-age=0"
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      /* ignore */
    }
    router.push("/login")
  }

  const createRef = async () => {
    if (!refForm.name.trim()) {
      alert("Nombre requerido")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/referee-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: refForm.name,
          phone: refForm.phone,
          default_fee: Number(refForm.default_fee || 0),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error al crear árbitro")
        return
      }
      setRefForm({ name: "", phone: "", default_fee: refForm.default_fee })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const updateDefaultFee = async (id: number, fee: number) => {
    setSaving(true)
    try {
      await fetch("/api/referee-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, default_fee: fee }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const deactivateRef = async (id: number) => {
    if (!confirm("¿Desactivar este árbitro?")) return
    setSaving(true)
    try {
      await fetch(`/api/referee-profiles?id=${id}`, { method: "DELETE" })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const assign = async (gameId: number, role: string, refereeId: string, fee?: string) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        game_id: gameId,
        role,
        referee_id: refereeId ? Number(refereeId) : null,
      }
      if (fee !== undefined && fee !== "") body.fee = Number(fee)
      const res = await fetch("/api/game-referee-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error al asignar")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const saveAssignmentFee = async (gameId: number, role: string, refereeId: number, fee: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/game-referee-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          role,
          referee_id: refereeId,
          fee: Number(fee),
        }),
      })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error al guardar fee")
      setEditingFee(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const getAssignment = (row: GameRow, role: string) =>
    row.assignments.find((a) => a.role === role)

  const formatDate = (d?: string) => {
    if (!d) return "—"
    return d.slice(0, 10)
  }

  const totalPayroll = useMemo(
    () => earnings.reduce((s, e) => s + Number(e.total || 0), 0),
    [earnings],
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Portal de Árbitros</h1>
              <p className="text-sm text-gray-500">
                {user.username} · {user.role === "admin" ? "Admin" : "Coordinador"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {user.role === "admin" && (
              <Button variant="outline" onClick={() => router.push("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Resumen salarios */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Árbitros activos</p>
                  <p className="text-2xl font-bold text-gray-900">{refs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-500">Partidos (filtro)</p>
                  <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Nómina asignada</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalPayroll.toLocaleString("es-MX")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRUD árbitros */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Árbitros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3 items-end">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={refForm.name}
                  onChange={(e) => setRefForm({ ...refForm, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={refForm.phone}
                  onChange={(e) => setRefForm({ ...refForm, phone: e.target.value })}
                  placeholder="618..."
                />
              </div>
              <div>
                <Label>Fee default ($)</Label>
                <Input
                  type="number"
                  value={refForm.default_fee}
                  onChange={(e) => setRefForm({ ...refForm, default_fee: e.target.value })}
                />
              </div>
              <Button onClick={createRef} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-1" />
                Alta
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Teléfono</th>
                    <th className="py-2 pr-3">Fee default</th>
                    <th className="py-2 pr-3">Ganado (filtro)</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {refs.map((r) => {
                    const earn = earnings.find((e) => e.referee_id === r.id)
                    return (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-medium text-gray-900">{r.name}</td>
                        <td className="py-2 pr-3 text-gray-600">{r.phone || "—"}</td>
                        <td className="py-2 pr-3">
                          <Input
                            className="w-28 h-8"
                            type="number"
                            defaultValue={r.default_fee}
                            onBlur={(e) => {
                              const v = Number(e.target.value)
                              if (v !== Number(r.default_fee)) updateDefaultFee(r.id, v)
                            }}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          {earn ? (
                            <span>
                              ${Number(earn.total).toLocaleString("es-MX")}{" "}
                              <span className="text-gray-400">({earn.games})</span>
                            </span>
                          ) : (
                            "$0"
                          )}
                        </td>
                        <td className="py-2">
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => deactivateRef(r.id)}>
                            Desactivar
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {refs.length === 0 && (
                <p className="text-center text-gray-500 py-6">Aún no hay árbitros. Da de alta el primero.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros + juegos */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Partidos — temporada activa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3 items-end">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div>
                <Label>Categoría</Label>
                <select
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {TEAM_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                <input
                  type="checkbox"
                  checked={unassignedOnly}
                  onChange={(e) => setUnassignedOnly(e.target.checked)}
                />
                Solo sin asignar (&lt; 2 refs)
              </label>
              <Button variant="outline" onClick={() => { setFilterDate(""); setFilterCategory(""); setUnassignedOnly(false) }}>
                Limpiar filtros
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Cargando partidos…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay partidos con estos filtros.</p>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => {
                  const a1 = getAssignment(row, "referee1")
                  const a2 = getAssignment(row, "referee2")
                  const a3 = getAssignment(row, "referee3")
                  return (
                    <div key={row.game.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {row.game.home_team} vs {row.game.away_team}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(row.game.game_date)}
                            {row.game.game_time ? ` · ${String(row.game.game_time).slice(0, 5)}` : ""}
                            {row.game.venue ? ` · ${row.game.venue}` : ""}
                            {row.game.field ? ` · Campo ${row.game.field}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {row.game.category && (
                            <Badge variant="outline">{getCategoryLabel(row.game.category)}</Badge>
                          )}
                          {row.game.jornada && <Badge variant="outline">J{row.game.jornada}</Badge>}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        {[
                          { role: "referee1", label: "Árbitro 1", a: a1 },
                          { role: "referee2", label: "Árbitro 2", a: a2 },
                          { role: "referee3", label: "Árbitro 3 (opc.)", a: a3 },
                        ].map(({ role, label, a }) => (
                          <div key={role} className="space-y-2 p-3 rounded-lg bg-gray-50">
                            <Label className="text-xs text-gray-500">{label}</Label>
                            <select
                              className="w-full rounded-md border border-gray-300 p-2 text-sm"
                              value={a?.referee_id || ""}
                              disabled={saving}
                              onChange={(e) => assign(row.game.id, role, e.target.value)}
                            >
                              <option value="">— Sin asignar —</option>
                              {refs.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} (${Number(r.default_fee).toLocaleString("es-MX")})
                                </option>
                              ))}
                            </select>
                            {a && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Fee $</span>
                                {editingFee?.id === a.id ? (
                                  <>
                                    <Input
                                      className="h-8 w-24"
                                      type="number"
                                      value={editingFee.fee}
                                      onChange={(e) => setEditingFee({ id: a.id, fee: e.target.value })}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      disabled={saving}
                                      onClick={() =>
                                        saveAssignmentFee(row.game.id, role, a.referee_id, editingFee.fee)
                                      }
                                    >
                                      OK
                                    </Button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-sm font-medium text-blue-700 hover:underline"
                                    onClick={() => setEditingFee({ id: a.id, fee: String(a.fee) })}
                                  >
                                    ${Number(a.fee).toLocaleString("es-MX")} (editar)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
