"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si ya está logueado
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role === "admin") {
          router.push("/admin")
        } else if (user.role === "referee_coordinator") {
          router.push("/arbitros")
        } else if (user.role === "player") {
          router.push("/player")
        } else if (user.role === "coach") {
          router.push("/coach-dashboard")
        } else {
          router.push("/coach-dashboard")
        }
      }
    } catch (e) {
      // Ignorar errores de parsing
    }
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("Enviando login para:", email)

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      console.log("Respuesta del login:", data)

      if (!data?.success || !data?.user) {
        setError(data?.message || "Credenciales inválidas")
        return
      }

      const user = data.user
      console.log("Usuario logueado:", user)

      // Guardar en localStorage
      try {
        localStorage.setItem("user", JSON.stringify(user))
        console.log("Usuario guardado en localStorage")
      } catch (storageError) {
        console.error("Error guardando en localStorage:", storageError)
      }

      // Crear cookie para el middleware
      document.cookie = `user=${JSON.stringify(user)}; path=/; max-age=${60 * 60 * 24 * 7}` // 7 días

      console.log("Cookie creada, redirigiendo...")

      // Redireccionar según el rol
      if (user.role === "admin" || user.role === "staff") {
        console.log("Redirigiendo a admin")
        router.push("/admin")
      } else if (user.role === "referee_coordinator") {
        console.log("Redirigiendo a portal de árbitros")
        router.push("/arbitros")
      } else if (user.role === "player") {
        console.log("Redirigiendo a player portal")
        router.push("/player")
      } else if (user.role === "coach") {
        console.log("Redirigiendo a coach dashboard")
        router.push("/coach-dashboard")
      } else {
        console.log("Redirigiendo a coach-dashboard")
        router.push("/coach-dashboard")
      }
    } catch (error) {
      console.error("Error en login:", error)
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-white">
      <div className="container mx-auto px-4 py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Correo o Usuario</Label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="correo@ejemplo.com o usuario"
                />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div role="alert" className="p-2 rounded bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center text-sm text-gray-600">
                ¿Aún no tienes cuenta?{" "}
                <a href="/register-team" className="underline">
                  Registra tu equipo
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
