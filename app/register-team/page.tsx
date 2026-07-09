"use client"

import type React from "react"

import { useEffect, useState } from "react"
import type { Season } from "@/lib/seasons"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, UserCheck } from "lucide-react"

export default function RegisterTeamPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    teamName: "",
    category: "varonil-libre",
    season_id: "",
  })
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/seasons").then((response) => response.json()).then((result) => {
      if (!result.success) return
      setSeasons(result.data || [])
      const active = result.data?.find((season: Season) => season.is_active)
      if (active) setFormData((current) => ({ ...current, season_id: active.id }))
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const teamResponse = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.teamName,
            category: formData.category,
            season_id: formData.season_id,
            coach_id: data.data.id,
            coach_name: formData.username,
            paid: false,
          }),
        })
        const teamData = await teamResponse.json()
        if (!teamData.success) {
          setError(`La cuenta se creó, pero el equipo no: ${teamData.message}`)
          return
        }
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        setError(data.message || "Error al registrar usuario")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <UserCheck className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Registro Exitoso!</h2>
            <p className="text-gray-600 mb-6">
              Tu cuenta de coach ha sido creada exitosamente. Ahora puedes iniciar sesión y crear tu equipo desde el
              dashboard.
            </p>
            <p className="text-sm text-gray-500">Serás redirigido al login en unos segundos...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Registro de Capitán/Coach</CardTitle>
              <p className="text-gray-600">Crea tu cuenta para administrar tu equipo en la Liga Flag Durango</p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="teamName" className="text-gray-700 font-medium">Nombre del equipo</Label>
                    <Input id="teamName" name="teamName" required value={formData.teamName} onChange={handleChange} className="mt-1" placeholder="Nombre sin sufijo" />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-gray-700 font-medium">Categoría</Label>
                    <select id="category" name="category" required value={formData.category} onChange={handleChange} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2">
                      <option value="varonil-libre">Varonil Libre</option>
                      <option value="varonil-master">Varonil Master</option>
                      <option value="varonil-gold">Varonil Gold</option>
                      <option value="varonil-silver">Varonil Silver</option>
                      <option value="femenil-gold">Femenil Gold</option>
                      <option value="femenil-silver">Femenil Silver</option>
                      <option value="mixto-gold">Mixto Gold</option>
                      <option value="mixto-silver">Mixto Silver</option>
                      <option value="mixto-recreativo">Mixto Recreativo</option>
                      <option value="teens">Teens</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="season_id" className="text-gray-700 font-medium">Temporada</Label>
                  <select id="season_id" name="season_id" required value={formData.season_id} onChange={handleChange} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2">
                    <option value="">Selecciona una temporada</option>
                    {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.is_active ? " (activa)" : ""}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">El equipo quedará pendiente de pago hasta que administración lo confirme.</p>
                </div>
                <div>
                  <Label htmlFor="username" className="text-gray-700 font-medium">
                    Nombre de Usuario
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Tu nombre de usuario"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                    Confirmar Contraseña
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Repite tu contraseña"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Después del registro:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Inicia sesión con tu cuenta</li>
                    <li>• Crea tu equipo desde el dashboard</li>
                    <li>• Agrega jugadores a tu roster</li>
                    <li>• Realiza el pago de inscripción</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                >
                  {loading ? "Registrando..." : "Crear Cuenta"}
                </Button>

                <div className="text-center">
                  <p className="text-gray-600">
                    ¿Ya tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Inicia sesión aquí
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
