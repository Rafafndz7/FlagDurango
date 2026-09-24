"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Key, Loader2, Shield, UserPlus } from "lucide-react"

type UserRow = {
  id: number
  username: string
  email: string
  role: string
  status: string
  created_at?: string
}

const ROLES = [
  "admin",
  "coach",
  "capitan",
  "staff",
  "referee_coordinator",
  "referee",
  "player",
  "user",
  "coordinator",
]

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users", { cache: "no-store" })
      const data = await res.json()
      if (data.success) setUsers(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createUser = async () => {
    if (!form.username || !form.email || !form.password) {
      alert("Completa usuario, email y contraseña")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo crear")
        return
      }
      alert(`Cuenta creada: ${form.username} (${form.role})`)
      setForm({ username: "", email: "", password: "", role: "admin" })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (id: number, role: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      })
      const data = await res.json()
      if (!data.success) alert(data.message || "Error al cambiar rol")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (id: number, status: string) => {
    setSaving(true)
    try {
      await fetch("/api/users", {
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
            <UserPlus className="w-5 h-5" />
            Crear cuenta (admin / roles)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Crea más administradores u otros roles desde aquí. Luego puedes cambiar el rol de cualquier usuario en la
            tabla de abajo.
          </p>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Usuario</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin2"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin2@flag.com"
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Rol</Label>
              <select
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={createUser} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Crear cuenta
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Key className="w-5 h-5" />
            Usuarios y roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-3">Usuario</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-900">{u.username}</td>
                      <td className="py-2 pr-3 text-gray-600">{u.email}</td>
                      <td className="py-2 pr-3">
                        <select
                          className="rounded-md border border-gray-300 p-1.5 text-sm"
                          value={u.role}
                          disabled={saving}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                          {!ROLES.includes(u.role) && <option value={u.role}>{u.role}</option>}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge className={u.status === "active" ? "bg-green-600" : "bg-gray-500"}>{u.status}</Badge>
                      </td>
                      <td className="py-2">
                        {u.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => changeStatus(u.id, "inactive")}>
                            Desactivar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => changeStatus(u.id, "active")}>
                            Activar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
