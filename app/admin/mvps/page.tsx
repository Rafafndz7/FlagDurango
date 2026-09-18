"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Star, Trophy, Target, Users, Plus, Trash2, RefreshCw, ArrowLeft, Award, Calendar } from "lucide-react"

interface Player {
  id: number
  name: string
  jersey_number?: number
  photo_url?: string
  team_id: number
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
    color1?: string
    color2?: string
  }
}

interface MVP {
  id: number
  player_id: number
  mvp_type: "weekly" | "game"
  category: string
  week_number?: number
  season?: string
  notes?: string
  created_at: string
  players?: {
    id: number
    name: string
    jersey_number?: number
    photo_url?: string
    teams?: {
      id: number
      name: string
      logo_url?: string
      color1?: string
      color2?: string
    }
  }
}

export default function AdminMVPsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [mvps, setMvps] = useState<MVP[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("varonil-libre")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [mvpForm, setMvpForm] = useState({
    player_id: "",
    mvp_type: "weekly" as "weekly" | "game",
    category: "varonil-libre",
    week_number: "",
    season: "2025",
    notes: "",
  })

  const categories = [
    { value: "varonil-libre", label: "Varonil Libre" },
    { value: "varonil-gold", label: "Varonil Gold" },
    { value: "varonil-silver", label: "Varonil Silver" },
    { value: "femenil-gold", label: "Femenil Gold" },
    { value: "femenil-silver", label: "Femenil Silver" },
    { value: "femenil-cooper-a", label: "Femenil Cooper A" },
    { value: "femenil-cooper-b", label: "Femenil Cooper B" },
    { value: "mixto-gold", label: "Mixto Gold" },
    { value: "mixto-silver", label: "Mixto Silver" },
  ]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setMvpForm((prev) => ({ ...prev, category: selectedCategory }))
  }, [selectedCategory])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("Loading MVP admin data...")

      const [playersRes, mvpsRes] = await Promise.all([fetch("/api/players"), fetch("/api/mvps")])

      const [playersData, mvpsData] = await Promise.all([playersRes.json(), mvpsRes.json()])

      console.log("Players response:", playersData)
      console.log("MVPs response:", mvpsData)

      if (playersData.success) {
        setPlayers(playersData.data || [])
        console.log("Players loaded:", playersData.data?.length || 0)
      } else {
        console.error("Error loading players:", playersData.message)
        showMessage("error", playersData.message || "Error al cargar jugadores")
      }

      if (mvpsData.success) {
        setMvps(mvpsData.data || [])
        console.log("MVPs loaded:", mvpsData.data?.length || 0)
      } else {
        console.error("Error loading MVPs:", mvpsData.message)
        showMessage("error", mvpsData.message || "Error al cargar MVPs")
      }
    } catch (error) {
      console.error("Error loading data:", error)
      showMessage("error", "Error de conexión al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleCreateMVP = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log("Creating MVP:", mvpForm)

      const response = await fetch("/api/mvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mvpForm,
          player_id: Number.parseInt(mvpForm.player_id),
          week_number: mvpForm.week_number ? Number.parseInt(mvpForm.week_number) : null,
        }),
      })

      const data = await response.json()
      console.log("MVP creation response:", data)

      if (data.success) {
        showMessage("success", "MVP creado exitosamente")
        setMvpForm({
          player_id: "",
          mvp_type: "weekly",
          category: selectedCategory,
          week_number: "",
          season: "2025",
          notes: "",
        })
        loadData()
      } else {
        showMessage("error", data.message || "Error al crear MVP")
      }
    } catch (error) {
      console.error("Error creating MVP:", error)
      showMessage("error", "Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMVP = async (mvpId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este MVP?")) return

    setSaving(true)

    try {
      const response = await fetch(`/api/mvps?id=${mvpId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        showMessage("success", "MVP eliminado exitosamente")
        loadData()
      } else {
        showMessage("error", data.message || "Error al eliminar MVP")
      }
    } catch (error) {
      console.error("Error deleting MVP:", error)
      showMessage("error", "Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const getCategoryColor = (category: string) => {
    if (category.includes("femenil")) return "bg-pink-500"
    if (category.includes("mixto")) return "bg-orange-500"
    return "bg-blue-500"
  }

  const filteredPlayers = players.filter((player) => player.teams?.category === selectedCategory)
  const filteredMVPs = mvps.filter((mvp) => mvp.category === selectedCategory)

  const weeklyMVPs = filteredMVPs.filter((mvp) => mvp.mvp_type === "weekly")
  const gameMVPs = filteredMVPs.filter((mvp) => mvp.mvp_type === "game")
  const uniquePlayers = new Set(filteredMVPs.map((mvp) => mvp.player_id)).size

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-white flex items-center justify-center">
        <div className="text-xl">Cargando gestión de MVPs...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => (window.location.href = "/admin")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Admin
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Star className="w-10 h-10 text-yellow-600" />
            Gestión de MVPs
          </h1>
          <p className="text-gray-600">Administra los MVPs semanales y de juego por categoría</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filtro de categoría */}
        <div className="mb-6">
          <Label className="text-base font-semibold mb-3 block">Seleccionar Categoría</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                variant={selectedCategory === category.value ? "default" : "outline"}
                className={
                  selectedCategory === category.value
                    ? `${getCategoryColor(category.value)} text-white`
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MVPs Semanales</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyMVPs.length}</div>
              <p className="text-xs text-muted-foreground">Valen 2 puntos c/u</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MVPs de Juego</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gameMVPs.length}</div>
              <p className="text-xs text-muted-foreground">Valen 1 punto c/u</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jugadores Únicos</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniquePlayers}</div>
              <p className="text-xs text-muted-foreground">Con al menos 1 MVP</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jugadores Disponibles</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPlayers.length}</div>
              <p className="text-xs text-muted-foreground">En esta categoría</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario para crear MVP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Crear Nuevo MVP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMVP} className="space-y-4">
                <div>
                  <Label>Tipo de MVP</Label>
                  <select
                    value={mvpForm.mvp_type}
                    onChange={(e) => setMvpForm({ ...mvpForm, mvp_type: e.target.value as "weekly" | "game" })}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="weekly">MVP Semanal (2 puntos)</option>
                    <option value="game">MVP de Juego (1 punto)</option>
                  </select>
                </div>

                <div>
                  <Label>Jugador</Label>
                  <select
                    value={mvpForm.player_id}
                    onChange={(e) => setMvpForm({ ...mvpForm, player_id: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Seleccionar jugador</option>
                    {filteredPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        #{player.jersey_number || "S/N"} {player.name} - {player.teams?.name}
                      </option>
                    ))}
                  </select>
                  {filteredPlayers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">No hay jugadores disponibles en esta categoría</p>
                  )}
                </div>

                {mvpForm.mvp_type === "weekly" && (
                  <div>
                    <Label>Número de Semana</Label>
                    <Input
                      type="number"
                      value={mvpForm.week_number}
                      onChange={(e) => setMvpForm({ ...mvpForm, week_number: e.target.value })}
                      placeholder="Ej: 1, 2, 3..."
                      min="1"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label>Temporada</Label>
                  <Input
                    value={mvpForm.season}
                    onChange={(e) => setMvpForm({ ...mvpForm, season: e.target.value })}
                    placeholder="2025"
                  />
                </div>

                <div>
                  <Label>Notas (Opcional)</Label>
                  <Input
                    value={mvpForm.notes}
                    onChange={(e) => setMvpForm({ ...mvpForm, notes: e.target.value })}
                    placeholder="Comentarios adicionales..."
                  />
                </div>

                <Button type="submit" disabled={saving || filteredPlayers.length === 0} className="w-full">
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {saving ? "Creando..." : "Crear MVP"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de MVPs existentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>MVPs de {categories.find((c) => c.value === selectedCategory)?.label}</CardTitle>
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredMVPs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay MVPs registrados en esta categoría</p>
                  </div>
                ) : (
                  filteredMVPs.map((mvp) => (
                    <div key={mvp.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={mvp.mvp_type === "weekly" ? "bg-yellow-600" : "bg-green-600"}>
                            {mvp.mvp_type === "weekly" ? "Semanal" : "Juego"}
                          </Badge>
                          {mvp.mvp_type === "weekly" && mvp.week_number && (
                            <Badge variant="outline">Semana {mvp.week_number}</Badge>
                          )}
                        </div>
                        <Button onClick={() => handleDeleteMVP(mvp.id)} variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={
                              mvp.players?.photo_url ||
                              "/placeholder.svg?height=40&width=40&query=foto-jugador" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg"
                            }
                            alt={mvp.players?.name || "Jugador"}
                            className="object-cover w-10 h-10"
                          />
                        </div>
                        <div>
                          <div className="font-semibold">{mvp.players?.name || "Jugador desconocido"}</div>
                          <div className="text-sm text-gray-600">
                            {mvp.players?.teams?.name || "Equipo desconocido"}
                          </div>
                          <div className="text-xs text-gray-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(mvp.created_at).toLocaleDateString("es-ES")}
                          </div>
                        </div>
                      </div>

                      {mvp.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{mvp.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
