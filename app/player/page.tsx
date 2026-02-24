"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Upload,
  Save,
  FileImage,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
  Search,
  Send,
  Clock,
  XCircle,
  Users,
  ArrowRightLeft,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import PlayerQRCard from "@/components/player-qr-card"

interface PlayerProfile {
  id: number
  name: string
  jersey_number?: number
  position?: string
  photo_url?: string
  team_id?: number | null
  birth_date?: string
  phone?: string
  personal_email?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  blood_type?: string
  seasons_played?: number
  playing_since?: string
  medical_conditions?: string
  cedula_url?: string
  profile_completed?: boolean
  admin_verified?: boolean
  category_verified?: boolean
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
  }
}

interface UserData {
  id: number
  username: string
  email: string
  role: string
}

interface TeamItem {
  id: number
  name: string
  category: string
  logo_url?: string
  color1?: string
  color2?: string
  coach_name?: string
}

interface JoinRequest {
  id: number
  team_id: number
  player_name: string
  position: string
  jersey_number: number
  status: string
  created_at: string
  message?: string
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
    color1?: string
    color2?: string
  }
}

interface PlayerTeamEntry {
  player_row_id: number
  team_id: number
  team: {
    id: number
    name: string
    category: string
    logo_url?: string
  }
  position: string
  jersey_number: number
}

export default function PlayerPortal() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [playerTeams, setPlayerTeams] = useState<PlayerTeamEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCedula, setUploadingCedula] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Team browsing state
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [sendingRequest, setSendingRequest] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [requestingTeamId, setRequestingTeamId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showTransferView, setShowTransferView] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const cedulaInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    birth_date: "",
    phone: "",
    personal_email: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    blood_type: "",
    seasons_played: "",
    playing_since: "",
    medical_conditions: "",
  })

  const fetchPlayerProfile = useCallback(async (userId: number, userEmail?: string) => {
    try {
      const res = await fetch(`/api/player/profile?user_id=${userId}`)
      const data = await res.json()

      if (data.success && data.data) {
        setPlayer(data.data)
        setPlayerTeams(data.playerTeams || [])
        setForm({
          birth_date: data.data.birth_date || "",
          phone: data.data.phone || "",
          personal_email: data.data.personal_email || userEmail || "",
          address: data.data.address || "",
          emergency_contact: data.data.emergency_contact || "",
          emergency_phone: data.data.emergency_phone || "",
          blood_type: data.data.blood_type || "",
          seasons_played: data.data.seasons_played?.toString() || "",
          playing_since: data.data.playing_since || "",
          medical_conditions: data.data.medical_conditions || "",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.role !== "player") {
      router.push("/")
      return
    }

    setUser(userData)
    fetchPlayerProfile(userData.id, userData.email)
  }, [router, fetchPlayerProfile])

  // Load teams and join requests for all players (needed for transfers too)
  useEffect(() => {
    if (player && user) {
      loadTeamsAndRequests()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, user?.id])

  const loadTeamsAndRequests = async () => {
    if (!user) return
    setLoadingTeams(true)
    try {
      const [teamsRes, requestsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch(`/api/team-join-requests?player_user_id=${user.id}`),
      ])
      const teamsData = await teamsRes.json()
      const requestsData = await requestsRes.json()

      if (teamsData.success) {
        setTeams(teamsData.data || [])
      }
      if (requestsData.success) {
        setJoinRequests(requestsData.data || [])
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSendRequest = async (teamId: number, isTransferRequest = false) => {
    if (!user || !player) return
    setSendingRequest(teamId)

    try {
      const body: Record<string, unknown> = {
        player_user_id: user.id,
        player_id: player.id,
        team_id: teamId,
        player_name: player.name,
        position: player.position || "QB",
        jersey_number: player.jersey_number || 0,
        phone: player.phone || null,
        message: requestMessage || null,
      }

      // If player already has a team and wants to transfer (change team), add transfer fields
      if (isTransferRequest && player.team_id) {
        body.is_transfer = true
        body.from_team_id = player.team_id
      }

      const res = await fetch("/api/team-join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: data.message || "Solicitud enviada exitosamente" })
        setRequestMessage("")
        setRequestingTeamId(null)
        await loadTeamsAndRequests()
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch {
      setMessage({ type: "error", text: "Error al enviar la solicitud" })
    } finally {
      setSendingRequest(null)
    }
  }

  // Helper: get category branch for transfer logic
  const getCategoryBranch = (category: string): string => {
    if (!category) return "unknown"
    const cat = category.toLowerCase()
    if (cat.startsWith("femenil")) return "femenil"
    if (cat.startsWith("varonil")) return "varonil"
    if (cat.startsWith("mixto")) return "mixto"
    if (cat.startsWith("teens")) return "teens"
    return "unknown"
  }

  const isTransferSameBranch = (targetTeam: TeamItem): boolean => {
    if (!player?.teams?.category || !targetTeam.category) return false
    return getCategoryBranch(player.teams.category) === getCategoryBranch(targetTeam.category)
  }

  const handleSendTransferRequest = async (teamId: number) => {
    if (!user || !player) return
    setSendingRequest(teamId)

    try {
      const res = await fetch("/api/team-join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_user_id: user.id,
          player_id: player.id,
          team_id: teamId,
          player_name: player.name,
          position: player.position || "QB",
          jersey_number: player.jersey_number || 0,
          phone: player.phone || null,
          message: requestMessage || null,
          is_transfer: true,
          from_team_id: player.team_id,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: data.message || "Solicitud de transferencia enviada" })
        setRequestMessage("")
        setRequestingTeamId(null)
        await loadTeamsAndRequests()
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch {
      setMessage({ type: "error", text: "Error al enviar la solicitud de transferencia" })
    } finally {
      setSendingRequest(null)
    }
  }

  const handleFileUpload = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        return data.url
      } else {
        setMessage({ type: "error", text: data.message })
        return null
      }
    } catch {
      setMessage({ type: "error", text: "Error al subir el archivo" })
      return null
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingPhoto(true)
    const url = await handleFileUpload(file, "player-photos")

    if (url) {
      setPlayer(prev => prev ? { ...prev, photo_url: url } : null)

      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, photo_url: url }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "Foto actualizada exitosamente" })
      }
    }
    setUploadingPhoto(false)
  }

  const handleCedulaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingCedula(true)
    const url = await handleFileUpload(file, "cedulas")

    if (url) {
      setPlayer(prev => prev ? { ...prev, cedula_url: url } : null)

      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, cedula_url: url }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "Cedula subida exitosamente" })
      }
    }
    setUploadingCedula(false)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          ...form,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setPlayer(data.data)
        setMessage({ type: "success", text: "Perfil guardado exitosamente" })
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch {
      setMessage({ type: "error", text: "Error al guardar el perfil" })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
              <p className="text-muted-foreground mb-4">
                No se encontro un perfil de jugador asociado a tu cuenta.
              </p>
              <Button onClick={handleLogout} variant="outline">
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If the player has any team (including from other rows), show the profile form
  const hasTeam = (player.team_id !== null && player.team_id !== undefined) || playerTeams.length > 0

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequestTeamIds = joinRequests
    .filter(r => r.status === "pending" || r.status === "pending_coordinator")
    .map(r => r.team_id)

  const getRequestStatus = (teamId: number) => {
    const req = joinRequests.find(r => r.team_id === teamId)
    return req?.status || null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Portal del Jugador</h1>
              <p className="text-sm text-muted-foreground">Flag Durango</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{player.name}</p>
              <p className="text-xs text-muted-foreground">
                #{player.jersey_number} - {player.position}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <p className={message.type === "success" ? "text-green-600" : "text-destructive"}>
              {message.text}
            </p>
          </div>
        )}

        {!hasTeam ? (
          /* ====== NO TEAM: Browse teams + request to join ====== */
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-700">Busca tu equipo</h3>
                <p className="text-sm text-muted-foreground">
                  Aun no perteneces a ningun equipo. Busca un equipo y envia tu solicitud. El coach revisara y aceptara o rechazara tu solicitud.
                </p>
              </div>
            </div>

            {/* My Requests */}
            {joinRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Mis Solicitudes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {req.teams?.logo_url ? (
                            <img
                              src={req.teams.logo_url}
                              alt={req.teams?.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                              style={{
                                backgroundColor: req.teams?.color1 || "#3B82F6",
                                color: "#fff",
                              }}
                            >
                              {req.teams?.name?.charAt(0) || "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{req.teams?.name || "Equipo"}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.teams?.category} - Enviada el{" "}
                              {new Date(req.created_at).toLocaleDateString("es-MX")}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            req.status === "pending"
                              ? "secondary"
                              : req.status === "accepted"
                              ? "default"
                              : "destructive"
                          }
                          className="flex items-center gap-1"
                        >
                          {req.status === "pending" && <Clock className="h-3 w-3" />}
                          {req.status === "accepted" && <CheckCircle className="h-3 w-3" />}
                          {req.status === "rejected" && <XCircle className="h-3 w-3" />}
                          {req.status === "pending"
                            ? "Pendiente"
                            : req.status === "accepted"
                            ? "Aceptada"
                            : "Rechazada"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo por nombre o categoria..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Teams List */}
            {loadingTeams ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No se encontraron equipos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredTeams.map((team) => {
                  const reqStatus = getRequestStatus(team.id)
                  const isPending = pendingRequestTeamIds.includes(team.id)

                  return (
                    <Card key={team.id} className="overflow-hidden">
                      <div
                        className="h-2"
                        style={{
                          background: `linear-gradient(to right, ${team.color1 || "#3B82F6"}, ${team.color2 || "#1E40AF"})`,
                        }}
                      />
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
                              style={{
                                backgroundColor: team.color1 || "#3B82F6",
                                color: "#fff",
                              }}
                            >
                              {team.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{team.name}</h3>
                            <Badge variant="outline" className="mt-1">
                              {team.category || "Sin categoria"}
                            </Badge>
                            {team.coach_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Coach: {team.coach_name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          {reqStatus === "accepted" ? (
                            <Badge className="w-full justify-center py-2 bg-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aceptado
                            </Badge>
                          ) : reqStatus === "rejected" ? (
                            <Badge variant="destructive" className="w-full justify-center py-2">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazada
                            </Badge>
                          ) : isPending ? (
                            <Badge variant="secondary" className="w-full justify-center py-2">
                              <Clock className="h-4 w-4 mr-1" />
                              Solicitud Pendiente
                            </Badge>
                          ) : requestingTeamId === team.id ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Mensaje al coach (opcional)..."
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                className="text-sm"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleSendRequest(team.id)}
                                  disabled={sendingRequest === team.id}
                                >
                                  {sendingRequest === team.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-1" />
                                  )}
                                  Enviar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRequestingTeamId(null)
                                    setRequestMessage("")
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => setRequestingTeamId(team.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Solicitar Unirme
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ====== HAS TEAM: Normal profile view ====== */
          <>
            {!player.profile_completed && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-600">Completa tu perfil</h3>
                  <p className="text-sm text-muted-foreground">
                    Por favor completa tu informacion personal y sube tu cedula para que podamos verificar que estas en la categoria correcta.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Profile Card */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Mi Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-primary/20">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-16 w-16 text-muted-foreground" />
                        )}
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold">{player.name}</h2>
                    {player.jersey_number && (
                      <p className="text-2xl font-bold text-primary">#{player.jersey_number}</p>
                    )}
                  </div>

                  {/* Team Info */}
                  {playerTeams.length > 0 ? (
                    <div className="pt-4 border-t space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {playerTeams.length === 1 ? "Equipo" : "Equipos"}
                      </p>
                      {playerTeams.map((pt) => (
                        <div key={pt.team_id} className="flex items-center gap-2">
                          {pt.team.logo_url ? (
                            <img
                              src={pt.team.logo_url}
                              alt={pt.team.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {pt.team.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{pt.team.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {pt.team.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : player.teams ? (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Equipo</p>
                      <p className="font-medium">{player.teams.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {player.teams.category}
                      </Badge>
                    </div>
                  ) : null}

                  {/* Status */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Perfil completo</span>
                      {player.profile_completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Verificado</span>
                      {player.admin_verified ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code Card */}
              <PlayerQRCard
                playerId={player.id}
                playerName={player.name}
                teamName={player.teams?.name}
                teamCategory={player.teams?.category}
                jerseyNumber={player.jersey_number}
                position={player.position}
                photoUrl={player.photo_url}
              />

              {/* Form Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Informacion Personal</CardTitle>
                  <CardDescription>
                    Completa tu informacion para verificar tu categoria
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cedula Upload */}
                  <div className="p-4 border-2 border-dashed rounded-lg">
                    <Label className="flex items-center gap-2 mb-3">
                      <FileImage className="h-4 w-4" />
                      Cedula de Identidad (INE/IFE)
                    </Label>
                    <input
                      ref={cedulaInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleCedulaChange}
                      className="hidden"
                    />
                    {player.cedula_url ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-green-500/10 rounded-lg flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm">Cedula subida</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cedulaInputRef.current?.click()}
                          disabled={uploadingCedula}
                        >
                          {uploadingCedula ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cambiar"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-20"
                        onClick={() => cedulaInputRef.current?.click()}
                        disabled={uploadingCedula}
                      >
                        {uploadingCedula ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6" />
                            <span>Subir cedula</span>
                          </div>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Experience Section */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="seasons_played" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Temporadas jugadas
                      </Label>
                      <Input
                        id="seasons_played"
                        type="number"
                        min="0"
                        placeholder="Ej: 3"
                        value={form.seasons_played}
                        onChange={(e) => setForm({ ...form, seasons_played: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="playing_since" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Jugando desde (anio)
                      </Label>
                      <Input
                        id="playing_since"
                        type="number"
                        min="1990"
                        max={new Date().getFullYear()}
                        placeholder="Ej: 2020"
                        value={form.playing_since}
                        onChange={(e) => setForm({ ...form, playing_since: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="birth_date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de nacimiento
                      </Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={form.birth_date}
                        onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="blood_type" className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Tipo de sangre
                      </Label>
                      <Select
                        value={form.blood_type}
                        onValueChange={(value) => setForm({ ...form, blood_type: value })}
                      >
                        <SelectTrigger id="blood_type">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefono
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="618 123 4567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="personal_email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email personal (opcional)
                      </Label>
                      <Input
                        id="personal_email"
                        type="email"
                        placeholder="tu@email.com"
                        value={form.personal_email}
                        onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
                      />
                      {user?.email && !form.personal_email && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Se usara tu email de cuenta: {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Direccion
                    </Label>
                    <Input
                      id="address"
                      placeholder="Calle, Colonia, Ciudad"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Contacto de Emergencia
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="emergency_contact">Nombre</Label>
                        <Input
                          id="emergency_contact"
                          placeholder="Nombre del contacto"
                          value={form.emergency_contact}
                          onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_phone">Telefono</Label>
                        <Input
                          id="emergency_phone"
                          type="tel"
                          placeholder="618 123 4567"
                          value={form.emergency_phone}
                          onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Conditions */}
                  <div>
                    <Label htmlFor="medical_conditions">Condiciones medicas (opcional)</Label>
                    <Textarea
                      id="medical_conditions"
                      placeholder="Alergias, condiciones medicas relevantes..."
                      value={form.medical_conditions}
                      onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })}
                    />
                  </div>

                  {/* Save Button */}
                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Informacion
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Join Another Team Section */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Unirse a Otro Equipo
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransferView(!showTransferView)}
                    className="flex items-center gap-1"
                  >
                    {showTransferView ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Ver Equipos
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Puedes pertenecer a varios equipos a la vez. Envia tu solicitud y espera la confirmacion del coach.
                </CardDescription>
              </CardHeader>

              {showTransferView && (
                <CardContent className="space-y-4">
                  {/* Pending requests from this player */}
                  {joinRequests.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Mis Solicitudes
                      </h4>
                      {joinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            {req.teams?.logo_url ? (
                              <img
                                src={req.teams.logo_url}
                                alt={req.teams?.name}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{
                                  backgroundColor: req.teams?.color1 || "#3B82F6",
                                  color: "#fff",
                                }}
                              >
                                {req.teams?.name?.charAt(0) || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{req.teams?.name || "Equipo"}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.teams?.category} - {new Date(req.created_at).toLocaleDateString("es-MX")}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              req.status === "pending" || req.status === "pending_coordinator"
                                ? "secondary"
                                : req.status === "accepted"
                                ? "default"
                                : "destructive"
                            }
                            className="flex items-center gap-1 text-xs"
                          >
                            {(req.status === "pending" || req.status === "pending_coordinator") && <Clock className="h-3 w-3" />}
                            {req.status === "accepted" && <CheckCircle className="h-3 w-3" />}
                            {req.status === "rejected" && <XCircle className="h-3 w-3" />}
                            {req.status === "pending"
                              ? "Pendiente"
                              : req.status === "pending_coordinator"
                              ? "Esperando Coordinador"
                              : req.status === "accepted"
                              ? "Aceptada"
                              : "Rechazada"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar equipo por nombre o categoria..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Teams List */}
                  {loadingTeams ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredTeams
                        .filter(t => {
                          // Exclude ALL teams the player already belongs to
                          const myTeamIds = playerTeams.map(pt => pt.team_id)
                          if (player.team_id) myTeamIds.push(player.team_id)
                          return !myTeamIds.includes(t.id)
                        })
                        .map((team) => {
                          const reqStatus = getRequestStatus(team.id)
                          const isPending = pendingRequestTeamIds.includes(team.id)
                          const sameBranch = isTransferSameBranch(team)

                          return (
                            <div key={team.id} className="rounded-lg border bg-card overflow-hidden">
                              <div
                                className="h-1.5"
                                style={{
                                  background: `linear-gradient(to right, ${team.color1 || "#3B82F6"}, ${team.color2 || "#1E40AF"})`,
                                }}
                              />
                              <div className="p-3">
                                <div className="flex items-start gap-3">
                                  {team.logo_url ? (
                                    <img
                                      src={team.logo_url}
                                      alt={team.name}
                                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div
                                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                                      style={{
                                        backgroundColor: team.color1 || "#3B82F6",
                                        color: "#fff",
                                      }}
                                    >
                                      {team.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{team.name}</h4>
                                    <Badge variant="outline" className="mt-0.5 text-xs">
                                      {team.category || "Sin categoria"}
                                    </Badge>
                                    {team.coach_name && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Coach: {team.coach_name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Transfer warning for same branch */}
                                {sameBranch && (
                                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs flex items-start gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-amber-700">
                                      Misma rama de categoria. Requiere aprobacion del coordinador de liga y ambos capitanes.
                                    </span>
                                  </div>
                                )}

                                <div className="mt-3">
                                  {reqStatus === "accepted" ? (
                                    <Badge className="w-full justify-center py-1.5 bg-green-600 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Ya perteneces a este equipo
                                    </Badge>
                                  ) : reqStatus === "rejected" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs"
                                      onClick={() => setRequestingTeamId(team.id)}
                                    >
                                      <Send className="h-3 w-3 mr-1" />
                                      Solicitar de Nuevo
                                    </Button>
                                  ) : isPending ? (
                                    <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Solicitud Pendiente
                                    </Badge>
                                  ) : requestingTeamId === team.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Mensaje al coach (opcional)..."
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                        className="text-xs"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="flex-1 text-xs"
                                          onClick={() => handleSendRequest(team.id, sameBranch)}
                                          disabled={sendingRequest === team.id}
                                        >
                                          {sendingRequest === team.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          ) : (
                                            <Send className="h-3 w-3 mr-1" />
                                          )}
                                          {sameBranch ? "Solicitar Transferencia" : "Solicitar Unirme"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs"
                                          onClick={() => {
                                            setRequestingTeamId(null)
                                            setRequestMessage("")
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs"
                                      onClick={() => setRequestingTeamId(team.id)}
                                    >
                                      <Send className="h-3 w-3 mr-1" />
                                      {sameBranch ? "Solicitar Transferencia" : "Solicitar Unirme"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
