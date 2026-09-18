"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

type FinanceRow = {
  team: {
    id: number
    name: string
    category: string
    paid?: boolean
    coach_name?: string
  }
  finance: {
    id: number | null
    registration_fee: number
    status: string
    notes: string | null
  }
  paid_total: number
  remaining: number
  installments: {
    id: number
    amount: number
    paid_at: string
    payment_method?: string
    held_by?: string
    note?: string
  }[]
}

export default function AdminFinanzasPanel() {
  const [rows, setRows] = useState<FinanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: "",
    payment_method: "efectivo",
    held_by: "",
    note: "",
    paid_at: new Date().toISOString().slice(0, 10),
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team-finance", { cache: "no-store" })
      const data = await res.json()
      if (!data.success) {
        setError(data.message || "Error al cargar finanzas")
        return
      }
      setRows(data.data || [])
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = rows.find((r) => r.team.id === selectedTeamId) || null

  const addInstallment = async () => {
    if (!selectedTeamId) return
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      alert("Monto inválido")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/team-finance/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: selectedTeamId,
          amount,
          payment_method: form.payment_method,
          held_by: form.held_by,
          note: form.note,
          paid_at: form.paid_at,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo guardar el abono")
        return
      }
      setForm({
        amount: "",
        payment_method: "efectivo",
        held_by: form.held_by,
        note: "",
        paid_at: new Date().toISOString().slice(0, 10),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async (teamId: number) => {
    if (!confirm("¿Marcar inscripción como pagada completa ($1900)?")) return
    setSaving(true)
    try {
      const res = await fetch("/api/team-finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          mark_paid: true,
          payment_method: "ajuste",
          held_by: "Admin",
        }),
      })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const deleteInstallment = async (id: number) => {
    if (!confirm("¿Eliminar este abono?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/team-finance/installments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await fetch("/api/team-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: selected.team.id,
          notes: selected.finance.notes,
          registration_fee: selected.finance.registration_fee,
        }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-600">Pagado</Badge>
    if (status === "partial") return <Badge className="bg-amber-500">Abonado</Badge>
    return <Badge className="bg-gray-500">Pendiente</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando finanzas…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <DollarSign className="w-5 h-5" />
            Finanzas — Inscripción temporada ($1,900)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">Equipo</th>
                  <th className="py-2 pr-3">Categoría</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Abonado</th>
                  <th className="py-2 pr-3">Restante</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.team.id} className="border-b border-gray-100">
                    <td className="py-3 pr-3 font-medium text-gray-900">{row.team.name}</td>
                    <td className="py-3 pr-3 text-gray-600">{getCategoryLabel(row.team.category)}</td>
                    <td className="py-3 pr-3">{statusBadge(row.finance.status)}</td>
                    <td className="py-3 pr-3">${row.paid_total.toLocaleString("es-MX")}</td>
                    <td className="py-3 pr-3">${row.remaining.toLocaleString("es-MX")}</td>
                    <td className="py-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedTeamId(row.team.id)}>
                        Abonos
                      </Button>
                      {row.finance.status !== "paid" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={saving}
                          onClick={() => markPaid(row.team.id)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pagado
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay equipos en la temporada activa.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Abonos — {selected.team.name} {statusBadge(selected.finance.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-gray-50">
                <p>Cuota: <strong>${Number(selected.finance.registration_fee).toLocaleString("es-MX")}</strong></p>
                <p>Abonado: <strong>${selected.paid_total.toLocaleString("es-MX")}</strong></p>
                <p>Restante: <strong>${selected.remaining.toLocaleString("es-MX")}</strong></p>
              </div>
              <div>
                <Label>Notas del equipo</Label>
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  rows={3}
                  value={selected.finance.notes || ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.team.id === selected.team.id
                          ? { ...r, finance: { ...r.finance, notes: e.target.value } }
                          : r,
                      ),
                    )
                  }
                />
                <Button size="sm" className="mt-2" variant="outline" onClick={saveNotes} disabled={saving}>
                  Guardar notas
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-3 items-end">
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div>
                <Label>Método</Label>
                <select
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <Label>Quién tiene el dinero</Label>
                <Input
                  value={form.held_by}
                  onChange={(e) => setForm({ ...form, held_by: e.target.value })}
                  placeholder="Ej. Rafa / Caja"
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                />
              </div>
              <Button onClick={addInstallment} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-1" />
                Agregar abono
              </Button>
            </div>
            <div>
              <Label>Nota del abono</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Historial</h4>
              {selected.installments.length === 0 ? (
                <p className="text-sm text-gray-500">Sin abonos registrados.</p>
              ) : (
                selected.installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        ${Number(inst.amount).toLocaleString("es-MX")} · {inst.payment_method || "—"}
                      </p>
                      <p className="text-gray-600">
                        {inst.paid_at}
                        {inst.held_by ? ` · Tiene: ${inst.held_by}` : ""}
                        {inst.note ? ` · ${inst.note}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteInstallment(inst.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
