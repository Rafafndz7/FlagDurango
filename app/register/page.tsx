"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const POSITIONS = [
  "QB", "WR", "RB", "OL", "DL", "LB", "DB", "K", "TE", "S", "CB", "C", "DE", "DT"
]

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<"coach" | "player">("player")
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Player-specific fields
    playerName: "",
    position: "QB",
    jerseyNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (formData.password !== formData.confirmPassword) {
      setMessage("Las contrasenas no coinciden.")
      setMessageType("error")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setMessage("La contrasena debe tener al menos 6 caracteres.")
      setMessageType("error")
      setLoading(false)
      return
    }

    if (accountType === "player") {
      if (!formData.playerName.trim()) {
        setMessage("El nombre completo es requerido.")
        setMessageType("error")
        setLoading(false)
        return
      }
      const num = parseInt(formData.jerseyNumber, 10)
      if (!num || num < 1 || num > 99) {
        setMessage("El numero de jersey debe ser entre 1 y 99.")
        setMessageType("error")
        setLoading(false)
        return
      }
    }

    try {
      const body: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: accountType,
      }

      if (accountType === "player") {
        body.playerName = formData.playerName.trim()
        body.position = formData.position
        body.jerseyNumber = parseInt(formData.jerseyNumber, 10)
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        setMessageType("success")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setMessage(data.message)
        setMessageType("error")
      }
    } catch {
      setMessage("Error de conexion. Intenta de nuevo.")
      setMessageType("error")
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">Unete a Liga Flag Durango</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Account Type Selector */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">Tipo de cuenta</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("player")}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  accountType === "player"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                Jugador
              </button>
              <button
                type="button"
                onClick={() => setAccountType("coach")}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  accountType === "coach"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                Coach
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Tu nombre de usuario"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Player-specific fields */}
            {accountType === "player" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playerName">Nombre completo</Label>
                  <Input
                    id="playerName"
                    name="playerName"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.playerName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="position">Posicion</Label>
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jerseyNumber">No. Jersey</Label>
                    <Input
                      id="jerseyNumber"
                      name="jerseyNumber"
                      type="number"
                      min={1}
                      max={99}
                      placeholder="1-99"
                      value={formData.jerseyNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contrasena</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repite tu contrasena"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {message && (
              <div
                className={`text-sm text-center p-2 rounded ${
                  messageType === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              disabled={loading}
            >
              {loading ? "Registrando..." : accountType === "player" ? "Crear Cuenta de Jugador" : "Crear Cuenta de Coach"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {"Ya tienes cuenta? "}
            <Link href="/login" className="text-orange-600 hover:underline font-medium">
              Inicia sesion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
