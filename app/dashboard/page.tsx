"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Trophy, Calendar, DollarSign, RefreshCw, CheckCircle, XCircle, Clock, Edit, Trash2, Settings, UserCheck } from 'lucide-react'

interface Team {
  id: number
  name: string
  category: string
  color1: string
  color2: string
  logo_url?: string
  stats?: {
    games_played: number
    wins: number
    losses: number
    draws: number
    points: number
    points_for: number
    points_against: number
  }
}

interface Game {
  id: number
  home_team: string
  away_team: string
  home_score?: number
  away_score?: number
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  referee1?: string
  referee2?: string
  mvp?: string
  status: string
}

interface Payment {
  id: number
  team_id?: number
  player_id?: number
  referee_id?: number
  payment_type: string
  amount: number
  description: string
  status: string
  due_date: string
  paid_date?: string
  created_at: string
  team?: { name: string }
  player?: { name: string }
  referee?: { name: string }
}

interface Venue {
  id: number
  name: string
  address: string
  city: string
  phone: string
}

interface Field {
  id: number
  name: string
  venue_id: number
  surface_type: string
  capacity: number
}

interface CoachPermission {
  id: number
  user_id: number
  team_id: number
  can_manage_players: boolean
  can_upload_logo: boolean
  can_upload_photos: boolean
  can_view_stats: boolean
  approved_by_admin: boolean
  users: { username: string; email: string }
  teams: { name: string; category: string }
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [coachPermissions, setCoachPermissions] = useState<CoachPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [systemConfig, setSystemConfig] = useState<{ [key: string]: string }>({})
  const [gamesCategoryFilter, setGamesCategoryFilter] = useState<string>("")

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: "",
    category: "varonil-gold",
    color1: "#3B82F6",
    color2: "#1E40AF",
    logo_url: "",
  })

  // NUEVO: alta rápida de jugador
  const [quickPlayer, setQuickPlayer] = useState({
    name: "",
    jersey_number: "",
    position: "",
    team_id: "",
  })

  const [gameForm, setGameForm] = useState({
    home_team: "",
    away_team: "",
    game_date: "",
    game_time: "",
    venue: "",
    field: "",
    category: "varonil-gold",
    referee1: "",
    referee2: "",
    status: "programado",
    match_type: "jornada",
  })

  const [paymentForm, setPaymentForm] = useState({
    team_id: "",
    payment_type: "registration",
    amount: "",
    description: "",
    due_date: "",
  })

  const loadSystemConfig = async () => {
    try {
      const response = await fetch("/api/system-config")
      const data = await response.json()

      if (data.success) {
        const configMap: { [key: string]: string } = {}
        data.data.forEach((config: any) => {
          configMap[config.config_key] = config.config_value
        })
        setSystemConfig(configMap)
      }
    } catch (error) {
      console.error("Error loading system config:", error)
    }
  }

  const loadCoachPermissions = async () => {
    try {
      const response = await fetch("/api/coach/all-permissions")
      const data = await response.json()

      if (data.success) {
        setCoachPermissions(data.data)
      }
    } catch (error) {
      console.error("Error loading coach permissions:", error)
    }
  }

  const toggleWildBrowl = async () => {
    const newValue = systemConfig.wildbrowl_enabled === "true" ? "false" : "true"
    await updateConfig("wildbrowl_enabled", newValue)
  }

  const toggleSeasonStatus = async () => {
    const newValue = systemConfig.season_started === "true" ? "false" : "true"
    await updateConfig("season_started", newValue)
  }

  const updateConfig = async (key: string, value: string) => {
    try {
      const response = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_key: key,
          config_value: value,
          description: `Configuration for ${key}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSystemConfig((prev) => ({ ...prev, [key]: value }))
        alert("Configuración actualizada exitosamente")
      } else {
        alert("Error al actualizar configuración")
      }
    } catch (error) {
      console.error("Error updating config:", error)
      alert("Error al actualizar configuración")
    }
  }

  const approveCoach = async (permissionId: number) => {
    try {
      const response = await fetch("/api/coach/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: permissionId,
          approved_by_admin: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await loadCoachPermissions()
        alert("Entrenador aprobado exitosamente")
      } else {
        alert("Error al aprobar entrenador")
      }
    } catch (error) {
      console.error("Error approving coach:", error)
      alert("Error al aprobar entrenador")
    }
  }

  const loadData = async () => {
    try {
      const [teamsRes, gamesRes, paymentsRes, venuesRes, fieldsRes] = await Promise.all([
        fetch("/api/teams").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/games").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/payments").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/venues").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/fields").catch(() => ({ json: () => ({ success: false, data: [] }) })),
      ])

      const [teamsData, gamesData, paymentsData, venuesData, fieldsData] = await Promise.all([
        teamsRes.json(),
        gamesRes.json(),
        paymentsRes.json(),
        venuesRes.json(),
        fieldsRes.json(),
      ])

      if (teamsData.success) setTeams(teamsData.data)
      if (gamesData.success) setGames(gamesData.data)
      if (paymentsData.success) setPayments(paymentsData.data)
      if (venuesData.success) setVenues(venuesData.data)
      if (fieldsData.success) setFields(fieldsData.data)

      await loadSystemConfig()
      await loadCoachPermissions()
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = async () => {
    setUpdating(true)
    try {
      const response = await fetch("/api/stats/update", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        alert("Estadísticas actualizadas correctamente")
        loadData()
      } else {
        alert("Error al actualizar estadísticas")
      }
    } catch (error) {
      console.error("Error updating stats:", error)
      alert("Error al actualizar estadísticas")
    } finally {
      setUpdating(false)
    }
  }

  const createTeam = async () => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      })

      const data = await response.json()

      if (data.success) {
        setTeamForm({
          name: "",
          category: "varonil-gold",
          color1: "#3B82F6",
          color2: "#1E40AF",
          logo_url: "",
        })
        loadData()
        alert("Equipo creado exitosamente")
      } else {
        alert(data.message || "Error al crear equipo")
      }
    } catch (error) {
      console.error("Error creating team:", error)
      alert("Error al crear equipo")
    }
  }

  // NUEVO: crear jugador rápido
  const createQuickPlayer = async () => {
    try {
      if (!quickPlayer.name || !quickPlayer.team_id || !quickPlayer.position || !quickPlayer.jersey_number) {
        alert("Nombre, equipo, posición y número son requeridos")
        return
      }
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickPlayer.name,
          team_id: Number.parseInt(quickPlayer.team_id),
          position: quickPlayer.position,
          jersey_number: Number.parseInt(quickPlayer.jersey_number),
        }),
      })
      const data = await response.json()
      if (data.success) {
        setQuickPlayer({ name: "", jersey_number: "", position: "", team_id: "" })
        alert("Jugador agregado exitosamente")
      } else {
        alert(data.message || "Error al agregar jugador")
      }
    } catch (e) {
      console.error("Error creating player:", e)
      alert("Error al agregar jugador")
    }
  }

  const deleteTeam = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este equipo?")) return

    try {
      const response = await fetch(`/api/teams?id=${id}`, { method: "DELETE" })
      const data = await response.json()

      if (data.success) {
        loadData()
        alert("Equipo eliminado exitosamente")
      } else {
        alert(data.message || "Error al eliminar equipo")
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      alert("Error al eliminar equipo")
    }
  }

  const createGame = async () => {
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameForm),
      })

      const data = await response.json()

      if (data.success) {
        setGameForm({
          home_team: "",
          away_team: "",
          game_date: "",
          game_time: "",
          venue: "",
          field: "",
          category: "varonil-gold",
          referee1: "",
          referee2: "",
          status: "programado",
          match_type: "jornada",
        })
        loadData()
        alert("Partido creado exitosamente")
      } else {
        alert(data.message || "Error al crear partido")
      }
    } catch (error) {
      console.error("Error creating game:", error)
      alert("Error al crear partido")
    }
  }

  const updateGameStatus = async (id: number, status: string, home_score?: number, away_score?: number) => {
    try {
      const response = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, home_score, away_score }),
      })

      const data = await response.json()

      if (data.success) {
        loadData()
        setEditingGame(null)
        alert("Partido actualizado exitosamente")
      } else {
        alert(data.message || "Error al actualizar partido")
      }
    } catch (error) {
      console.error("Error updating game:", error)
      alert("Error al actualizar partido")
    }
  }

  const deleteGame = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este partido?")) return

    try {
      const response = await fetch(`/api/games?id=${id}`, { method: "DELETE" })
      const data = await response.json()

      if (data.success) {
        loadData()
        alert("Partido eliminado exitosamente")
      } else {
        alert(data.message || "Error al eliminar partido")
      }
    } catch (error) {
      console.error("Error deleting game:", error)
      alert("Error al eliminar partido")
    }
  }

  const createPayment = async () => {
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          team_id: paymentForm.team_id ? Number.parseInt(paymentForm.team_id) : null,
          amount: Number.parseFloat(paymentForm.amount),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentForm({
          team_id: "",
          payment_type: "registration",
          amount: "",
          description: "",
          due_date: "",
        })
        loadData()
        alert("Pago registrado exitosamente")
      } else {
        alert(data.message || "Error al registrar pago")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      alert("Error al registrar pago")
    }
  }

  const updatePaymentStatus = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500"
      case "overdue":
        return "bg-red-500"
      default:
        return "bg-yellow-500"
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />
      case "overdue":
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "programado":
        return "bg-blue-600"
      case "en vivo":
        return "bg-red-600"
      case "en_vivo":
        return "bg-red-600"
      case "finalizado":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "programado":
        return "Programado"
      case "en vivo":
        return "En Vivo"
      case "en_vivo":
        return "En Vivo"
      case "finalizado":
        return "Finalizado"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Dashboard Admin</h1>
          <div className="flex gap-4">
            <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar
            </Button>
            <Button onClick={updateStats} disabled={updating} className="bg-green-600 hover:bg-green-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? "animate-spin" : ""}`} />
              {updating ? "Actualizando..." : "Actualizar Estadísticas"}
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Ver Sitio
            </Button>
          </div>
        </div>

        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="teams" className="data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-white/20">
              <Trophy className="w-4 h-4 mr-2" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/20">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-white/20">
              <Calendar className="w-4 h-4 mr-2" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="coaches" className="data-[state=active]:bg-white/20">
              <UserCheck className="w-4 h-4 mr-2" />
              Entrenadores
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-white/20">
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Equipos */}
          <TabsContent value="teams">
            <div className="grid gap-6">
              {/* Crear equipo */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear Nuevo Equipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Nombre del Equipo</Label>
                      <Input
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Categoría</Label>
                      <select
                        value={teamForm.category}
                        onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="varonil-gold">Varonil Gold</option>
                        <option value="varonil-silver">Varonil Silver</option>
                        <option value="femenil-gold">Femenil Gold</option>
                        <option value="femenil-silver">Femenil Silver</option>
                        <option value="mixto-gold">Mixto Gold</option>
                        <option value="mixto-silver">Mixto Silver</option>
                        <option value="femenil-cooper-a">Femenil Cooper A</option>
                        <option value="femenil-cooper-b">Femenil Cooper B</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Color 1</Label>
                      <Input
                        type="color"
                        value={teamForm.color1}
                        onChange={(e) => setTeamForm({ ...teamForm, color1: e.target.value })}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Color 2</Label>
                      <Input
                        type="color"
                        value={teamForm.color2}
                        onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <Button onClick={createTeam} className="w-full">
                    Crear Equipo
                  </Button>
                </CardContent>
              </Card>

              {/* NUEVO: Agregar Jugador Rápido */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar Jugador Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Nombre</Label>
                      <Input
                        value={quickPlayer.name}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Nombre del jugador"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Número</Label>
                      <Input
                        type="number"
                        value={quickPlayer.jersey_number}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, jersey_number: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Posición</Label>
                      <Input
                        value={quickPlayer.position}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, position: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="WR / QB / CB ..."
                      />
                    </div>
                    <div>
                      <Label className="text-white">Equipo</Label>
                      <select
                        value={quickPlayer.team_id}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, team_id: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar equipo</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button onClick={createQuickPlayer} className="w-full">
                    Agregar Jugador
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de equipos */}
              <div className="grid gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{
                              background: `linear-gradient(to right, ${team.color1}, ${team.color2})`,
                            }}
                          >
                            {team.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">{team.name}</h3>
                            <Badge>{team.category}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {team.stats && (
                            <div className="text-right text-white mr-4">
                              <div className="font-bold">{team.stats.points} pts</div>
                              <div className="text-sm text-white/70">
                                {team.stats.wins}W-{team.stats.losses}L-{team.stats.draws}D
                              </div>
                            </div>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteTeam(team.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Partidos */}
          <TabsContent value="games">
            <div className="grid gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Programar Nuevo Partido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Equipo Local</Label>
                      <select
                        value={gameForm.home_team}
                        onChange={(e) => setGameForm({ ...gameForm, home_team: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar equipo</option>
                        {teams
                          .filter((team) => team.category === gameForm.category)
                          .map((team) => (
                            <option key={team.id} value={team.name}>
                              {team.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Equipo Visitante</Label>
                      <select
                        value={gameForm.away_team}
                        onChange={(e) => setGameForm({ ...gameForm, away_team: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar equipo</option>
                        {teams
                          .filter((team) => team.category === gameForm.category)
                          .map((team) => (
                            <option key={team.id} value={team.name}>
                              {team.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Fecha</Label>
                      <Input
                        type="date"
                        value={gameForm.game_date}
                        onChange={(e) => setGameForm({ ...gameForm, game_date: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Hora</Label>
                      <Input
                        type="time"
                        value={gameForm.game_time}
                        onChange={(e) => setGameForm({ ...gameForm, game_time: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Tipo de Partido</Label>
                      <select
                        value={gameForm.match_type}
                        onChange={(e) => setGameForm({ ...gameForm, match_type: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="jornada">Jornada</option>
                        <option value="semifinal">Semifinal</option>
                        <option value="final">Final</option>
                        <option value="amistoso">Amistoso</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Sede</Label>
                      <select
                        value={gameForm.venue}
                        onChange={(e) => setGameForm({ ...gameForm, venue: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar sede</option>
                        {venues.map((venue) => (
                          <option key={venue.id} value={venue.name}>
                            {venue.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Campo</Label>
                      <select
                        value={gameForm.field}
                        onChange={(e) => setGameForm({ ...gameForm, field: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar campo</option>
                        {fields
                          .filter((field) => {
                            const selectedVenue = venues.find((v) => v.name === gameForm.venue)
                            return selectedVenue ? field.venue_id === selectedVenue.id : true
                          })
                          .map((field) => (
                            <option key={field.id} value={field.name}>
                              {field.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <Button onClick={createGame} className="w-full">
                    Programar Partido
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle>Partidos Programados</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/80">Filtrar por categoría:</span>
                    <select
                      value={gamesCategoryFilter}
                      onChange={(e) => setGamesCategoryFilter(e.target.value)}
                      className="p-2 rounded bg-white/10 border border-white/20 text-white"
                    >
                      <option value="">Todas</option>
                      <option value="varonil-gold">Varonil Gold</option>
                      <option value="varonil-silver">Varonil Silver</option>
                      <option value="femenil-gold">Femenil Gold</option>
                      <option value="femenil-silver">Femenil Silver</option>
                      <option value="femenil-cooper-a">Femenil Cooper A</option>
                      <option value="femenil-cooper-b">Femenil Cooper B</option>
                      <option value="mixto-gold">Mixto Gold</option>
                      <option value="mixto-silver">Mixto Silver</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {games
                    .filter((game) => !gamesCategoryFilter || game.category === gamesCategoryFilter)
                    .map((game) => (
                      <div key={game.id} className="flex items-center justify-between mb-4 p-4 bg-white/5 rounded">
                        <div>
                          <h3 className="text-white font-semibold text-lg">
                            {game.home_team} vs {game.away_team}
                          </h3>
                          <div className="text-white/70 text-sm">
                            {new Date(game.game_date).toLocaleDateString("es-ES")} - {game.game_time}
                          </div>
                          <div className="text-white/70 text-sm">
                            {game.venue} - {game.field}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getStatusColor(game.status)} text-white`}>{getStatusLabel(game.status)}</Badge>
                          {game.status === "finalizado" && (
                            <div className="text-white font-bold text-lg">
                              {game.home_score} - {game.away_score}
                            </div>
                          )}
                          <Button size="sm" onClick={() => setEditingGame(game)} className="bg-blue-600 hover:bg-blue-700">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteGame(game.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Edit Game Modal */}
              {editingGame && (
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 fixed inset-4 z-50 overflow-auto">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Editar Partido: {editingGame.home_team} vs {editingGame.away_team}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Estado</Label>
                        <select
                          value={editingGame.status}
                          onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value })}
                          className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                        >
                          <option value="programado">Programado</option>
                          <option value="en vivo">En Vivo</option>
                          <option value="finalizado">Finalizado</option>
                        </select>
                      </div>
                      <div />
                      {(editingGame.status === "en_vivo" || editingGame.status === "finalizado") && (
                        <>
                          <div>
                            <Label className="text-white">Marcador {editingGame.home_team}</Label>
                            <Input
                              type="number"
                              value={editingGame.home_score ?? 0}
                              onChange={(e) => setEditingGame({ ...editingGame, home_score: Number.parseInt(e.target.value || "0") })}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-white">Marcador {editingGame.away_team}</Label>
                            <Input
                              type="number"
                              value={editingGame.away_score ?? 0}
                              onChange={(e) => setEditingGame({ ...editingGame, away_score: Number.parseInt(e.target.value || "0") })}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEditingGame(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() =>
                          updateGameStatus(
                            editingGame.id,
                            editingGame.status,
                            editingGame.home_score,
                            editingGame.away_score
                          )
                        }
                      >
                        Guardar Cambios
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Pagos */}
          <TabsContent value="payments">
            <div className="grid gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Registrar Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Equipo</Label>
                      <select
                        value={paymentForm.team_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, team_id: e.target.value })}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                      >
                        <option value="">Seleccionar equipo</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-white">Monto</Label>
                      <Input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-white">Descripción</Label>
                      <Input
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Fecha límite</Label>
                      <Input
                        type="date"
                        value={paymentForm.due_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <Button onClick={createPayment} className="w-full">
                    Guardar Pago
                  </Button>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {payments.map((p) => (
                  <Card key={p.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          {p.team?.name || p.player?.name || p.referee?.name || "Entidad"}
                        </div>
                        <div className="text-white/70 text-sm">
                          {p.payment_type} — ${p.amount.toFixed(2)}
                        </div>
                        <div className="text-white/50 text-xs">Vence: {p.due_date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPaymentStatusColor(p.status)} text-white flex items-center gap-1`}>
                          {getPaymentStatusIcon(p.status)}
                          {p.status}
                        </Badge>
                        <Button size="sm" onClick={() => updatePaymentStatus(p.id, "paid")}>
                          Marcar Pagado
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Entrenadores */}
          <TabsContent value="coaches">
            <div className="grid gap-4">
              {coachPermissions.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-white/80">No hay solicitudes de entrenadores.</CardContent>
                </Card>
              ) : (
                coachPermissions.map((perm) => (
                  <Card key={perm.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="text-white">
                        <div className="font-semibold">{perm.users.username} ({perm.users.email})</div>
                        <div className="text-sm text-white/70">
                          Equipo: {perm.teams.name} — {perm.teams.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={perm.approved_by_admin ? "bg-green-600" : "bg-yellow-600"}>
                          {perm.approved_by_admin ? "Aprobado" : "Pendiente"}
                        </Badge>
                        {!perm.approved_by_admin && (
                          <Button size="sm" onClick={() => approveCoach(perm.id)}>
                            Aprobar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="config">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Configuraciones de la Liga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <div className="font-semibold">Temporada Iniciada</div>
                    <div className="text-white/70 text-sm">Controla el estado de la temporada</div>
                  </div>
                  <Button onClick={toggleSeasonStatus}>
                    {systemConfig.season_started === "true" ? "Marcar como NO iniciada" : "Marcar como Iniciada"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <div className="font-semibold">WildBrowl 1v1</div>
                    <div className="text-white/70 text-sm">Habilita o deshabilita el torneo 1v1</div>
                  </div>
                  <Button onClick={toggleWildBrowl}>
                    {systemConfig.wildbrowl_enabled === "true" ? "Deshabilitar" : "Habilitar"}
                  </Button>
                </div>

                <div>
                  <Label className="text-white">Fecha límite de inscripción</Label>
                  <div className="flex gap-3 mt-2">
                    <Input
                      type="date"
                      value={systemConfig.registration_deadline || ""}
                      onChange={(e) => setSystemConfig((prev) => ({ ...prev, registration_deadline: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button
                      onClick={() =>
                        updateConfig("registration_deadline", systemConfig.registration_deadline || "")
                      }
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendario - simple placeholder para mantener tabs sin errores */}
          <TabsContent value="schedule">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-white/80">Calendario próximamente.</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
