"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Plus, Edit, Trash2, DollarSign, Clock, Target, Star, UserPlus, Key, Copy, Check, Upload, Loader2, Medal, UserCheck, UserX, Inbox } from "lucide-react"
import CoachChampionships from "@/components/coach-championships"

interface CoachDashboardUser {
  id: number
  email: string
  role: string
  name?: string
  phone?: string
  approved?: boolean
  paid?: boolean
}

interface Team {
  id: number
  name: string
  category: string
  logo_url?: string
  color1: string
  color2: string
  coordinator_name?: string
  coordinator_phone?: string
  captain_photo_url?: string
  captain_name?: string
  captain_phone?: string
  coach_name?: string
  coach_phone?: string
  coach_photo_url?: string
  paid?: boolean
  coach_id?: number
  created_at?: string
}

interface Player {
  id: number
  name: string
  position: string
  photo_url?: string
  jersey_number?: number
  team_id: number
  user_id?: number
  profile_completed?: boolean
}

interface PlayerCredentials {
  player_id: number
  player_name: string
  email: string
  password: string
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
  status: string
  mvp?: string
  match_type?: string
  jornada?: number
}

interface GameForm {
  home_team: string
  away_team: string
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  match_type: string
  jornada?: number
}

interface PlayerForm {
  name: string
  position: string
  jersey_number: string
  photo_url: string
  team_id: string // Changed to string to match the input value type
}

interface JoinRequest {
  id: number
  player_user_id: number
  player_id?: number
  team_id: number
  player_name: string
  position: string
  jersey_number: number
  phone?: string
  message?: string
  status: string
  created_at: string
  updated_at?: string
  is_transfer?: boolean
  from_team_id?: number
  requires_coordinator_approval?: boolean
  teams?: {
    id: number
    name: string
    category: string
  }
}

interface CoachUser {
  id: number
  username: string
  email: string
  role: string
  created_at?: string
}

interface PotentialMatch {
  team_id: number
  team_name: string
  captain_name: string
  similarity_score: number
  time_difference_hours: number
  team_created: string
}

export default function CoachDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<CoachDashboardUser | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [payingTeam, setPayingTeam] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [creatingAccount, setCreatingAccount] = useState<number | null>(null)
  const [playerCredentials, setPlayerCredentials] = useState<PlayerCredentials | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showAccountForm, setShowAccountForm] = useState<Player | null>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)
  const [accountForm, setAccountForm] = useState({ email: "", password: "" })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCoachPhoto, setUploadingCoachPhoto] = useState(false)
  const coachPhotoInputRef = useRef<HTMLInputElement>(null)
  const [coachPhotoUrl, setCoachPhotoUrl] = useState("")

  // Filtros para juegos
  const [gameFilter, setGameFilter] = useState({
    status: "all", // all, programado, en_vivo, finalizado
    category: "all",
    team: "all",
  })

  // Estados para formularios
  const [teamForm, setTeamForm] = useState({
    name: "",
    category: "",
    color1: "#3B82F6",
    color2: "#1E40AF",
    logo_url: "",
    captain_name: "",
    captain_phone: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    is_institutional: false,
    coordinator_name: "",
    coordinator_phone: "",
  })

  // Forms
  const [gameForm, setGameForm] = useState<GameForm>({
    home_team: "",
    away_team: "",
    game_date: "",
    game_time: "",
    venue: "Polideportivo Mario Vázquez Raña",
    field: "Campo A",
    category: "",
    match_type: "jornada",
    jornada: 1,
  })

  const [playerForm, setPlayerForm] = useState<PlayerForm>({
    name: "",
    position: "QB",
    jersey_number: "",
    photo_url: "",
    team_id: "", // Initialize as empty string
  })

  const [playerFormOld, setPlayerFormOld] = useState({
    name: "",
    jersey_number: "",
    position: "",
    photo_url: "",
    team_id: "",
  })

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [showGameForm, setShowGameForm] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)

  useEffect(() => {
    // Verificar autenticación
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "coach") {
        router.push("/")
        return
      }
      setUser(parsedUser)
      console.log("👤 Usuario coach logueado:", parsedUser)
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
      return
    }
  }, [router])

  useEffect(() => {
    if (user) {
      loadDataOld()
    }
  }, [user])

  const calculateSimilarity = (captainName: string, coachUsername: string): number => {
    if (!captainName || !coachUsername) return 0

    const captain = captainName.toLowerCase().trim()
    const coach = coachUsername.toLowerCase().trim()
    const coachFirstName = coach.split(" ")[0]

    // Puntuación por similitud
    let score = 0

    // Match exacto del primer nombre
    if (captain === coachFirstName) score += 5
    // Captain contiene el primer nombre del coach
    else if (captain.includes(coachFirstName)) score += 3
    // Coach contiene el nombre del captain
    else if (coachFirstName.includes(captain)) score += 3
    // Similitud parcial
    else if (captain.substring(0, 3) === coachFirstName.substring(0, 3)) score += 1

    return score
  }

  const findPotentialMatches = (allTeams: Team[], user: CoachUser): PotentialMatch[] => {
    const teamsWithoutCoach = allTeams.filter((team) => !team.coach_id)
    const userCreatedAt = new Date(user.created_at || Date.now())

    return teamsWithoutCoach
      .map((team) => {
        const teamCreatedAt = new Date(team.created_at || Date.now())
        const timeDiffHours = Math.abs(teamCreatedAt.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60)
        const similarityScore = calculateSimilarity(team.captain_name || "", user.username)

        return {
          team_id: team.id,
          team_name: team.name,
          captain_name: team.captain_name || "",
          similarity_score: similarityScore,
          time_difference_hours: timeDiffHours,
          team_created: team.created_at || "",
        }
      })
      .filter((match) => match.similarity_score > 0 || match.time_difference_hours < 2)
      .sort((a, b) => {
        // Ordenar por score de similitud primero, luego por tiempo
        if (a.similarity_score !== b.similarity_score) {
          return b.similarity_score - a.similarity_score
        }
        return a.time_difference_hours - b.time_difference_hours
      })
  }

  const loadDataOld = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      console.log("🔄 Cargando datos para coach_id:", user.id)

      // Cargar todos los equipos
      const allTeamsRes = await fetch("/api/teams")
      const allTeamsData = await allTeamsRes.json()

      if (allTeamsData.success) {
        setAllTeams(allTeamsData.data || [])
        console.log("📊 Todos los equipos:", allTeamsData.data)

        // Buscar matches potenciales
        const matches = findPotentialMatches(allTeamsData.data || [], user)
        setPotentialMatches(matches)
        console.log("🎯 Matches potenciales:", matches)
      }

      // Cargar equipos del coach específico
      const teamsRes = await fetch(`/api/teams?coach_id=${user.id}`)
      const teamsData = await teamsRes.json()

      console.log("🏈 Respuesta equipos del coach:", teamsData)

      if (teamsData.success) {
        setTeams(teamsData.data || [])
        console.log("✅ Equipos del coach cargados:", teamsData.data?.length || 0)

        if (teamsData.data && teamsData.data.length > 0) {
          // Cargar jugadores de los equipos del coach
          const teamIds = teamsData.data.map((t: Team) => t.id)
          const playersRes = await fetch(`/api/players?team_ids=${teamIds.join(",")}`)
          const playersData = await playersRes.json()

          if (playersData.success) {
            setPlayers(playersData.data || [])
          }
        }
      } else {
        console.error("❌ Error cargando equipos:", teamsData.message)
        setError(teamsData.message)
      }

      // Cargar partidos
      const gamesRes = await fetch("/api/games")
      const gamesData = await gamesRes.json()

      if (gamesData.success) {
        setGames(gamesData.data || [])
      }

      // Cargar solicitudes de ingreso para los equipos del coach
      if (teamsData.success && teamsData.data && teamsData.data.length > 0) {
        const teamIds = teamsData.data.map((t: Team) => t.id)
        const allRequests: JoinRequest[] = []
        for (const tid of teamIds) {
          const reqRes = await fetch(`/api/team-join-requests?team_id=${tid}`)
          const reqData = await reqRes.json()
          if (reqData.success) {
            allRequests.push(...reqData.data)
          }
        }
        setJoinRequests(allRequests)
      }
    } catch (error) {
      console.error("💥 Error cargando datos:", error)
      setError("Error al cargar datos: " + (error instanceof Error ? error.message : "Error desconocido"))
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRequest = async (requestId: number, status: "accepted" | "rejected") => {
    if (!user) return
    setProcessingRequest(requestId)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/team-join-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          status,
          coach_user_id: user.id,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess(data.message)
        await loadDataOld()
      } else {
        setError(data.message)
      }
    } catch {
      setError("Error al procesar la solicitud")
    } finally {
      setProcessingRequest(null)
    }
  }

  const pendingJoinRequests = joinRequests.filter(r => r.status === "pending" || r.status === "pending_coordinator")
  const resolvedJoinRequests = joinRequests.filter(r => r.status === "accepted" || r.status === "rejected")

  const autoAssignBestMatches = async () => {
    if (potentialMatches.length === 0) return

    setAutoAssigning(true)
    setError(null)
    setSuccess(null)

    try {
      // Asignar los mejores matches (score > 2 y tiempo < 2 horas)
      const bestMatches = potentialMatches.filter(
        (match) => match.similarity_score >= 3 || (match.similarity_score > 0 && match.time_difference_hours < 1),
      )

      if (bestMatches.length === 0) {
        setError("No se encontraron matches automáticos suficientemente confiables")
        return
      }

      console.log("🚀 Asignando automáticamente:", bestMatches)

      const promises = bestMatches.map((match) =>
        fetch("/api/teams", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: match.team_id,
            coach_id: user!.id,
            coach_name: user!.username,
          }),
        }),
      )

      const results = await Promise.all(promises)
      const successful = results.filter((res) => res.ok)

      if (successful.length > 0) {
        setSuccess(
          `¡${successful.length} equipo(s) asignado(s) automáticamente! ${bestMatches
            .slice(0, successful.length)
            .map((m) => m.team_name)
            .join(", ")}`,
        )
        await loadDataOld() // Recargar datos
      } else {
        setError("Error al asignar equipos automáticamente")
      }
    } catch (error) {
      setError("Error en la asignación automática")
    } finally {
      setAutoAssigning(false)
    }
  }

  const assignSpecificTeam = async (teamId: number) => {
    try {
      const response = await fetch("/api/teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teamId,
          coach_id: user!.id,
          coach_name: user!.username,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSuccess("Equipo asignado exitosamente")
        await loadDataOld()
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError("Error al asignar equipo")
    }
  }

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      console.log("📝 Creando equipo con datos:", { ...teamForm, coach_id: user.id, coach_name: user.username })

      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teamForm,
          coach_id: user.id,
          coach_name: user.username,
          coach_photo_url: coachPhotoUrl || null,
        }),
      })

      const data = await response.json()
      console.log("📤 Respuesta crear equipo:", data)

      if (data.success) {
        console.log("✅ Equipo creado exitosamente")
        await loadDataOld()
        setTeamForm({
          name: "",
          category: "",
          color1: "#3B82F6",
          color2: "#1E40AF",
          logo_url: "",
          captain_name: "",
          captain_phone: "",
          contact_name: "",
          contact_phone: "",
          contact_email: "",
          is_institutional: false,
          coordinator_name: "",
          coordinator_phone: "",
        })
        setCoachPhotoUrl("")
        setError(null)
        setSuccess("Equipo creado exitosamente")
      } else {
        console.error("❌ Error creando equipo:", data.message)
        setError(data.message)
      }
    } catch (error) {
      console.error("💥 Error en createTeam:", error)
      setError("Error al crear equipo: " + (error instanceof Error ? error.message : "Error desconocido"))
    }
  }

  const createPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure playerForm.team_id is a number if it's not empty
    const teamId = playerForm.team_id ? Number.parseInt(playerForm.team_id, 10) : undefined
    const jerseyNumber = playerForm.jersey_number ? Number.parseInt(playerForm.jersey_number, 10) : undefined

    if (teamId === undefined || isNaN(teamId)) {
      setError("Por favor, selecciona un equipo válido.")
      return
    }
    if (jerseyNumber === undefined || isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      setError("Por favor, ingresa un número de jersey válido (1-99).")
      return
    }

    // Determine if it's an update or create operation based on editingPlayer
    const method = editingPlayer ? "PUT" : "POST"
    const url = editingPlayer ? `/api/players/${editingPlayer.id}` : "/api/players"

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...playerForm,
          team_id: teamId,
          jersey_number: jerseyNumber,
          // If editing, we might need the player ID as well, depending on the API.
          // Assuming the API handles it via URL for PUT.
        }),
      })

      const data = await response.json()
      if (data.success) {
        await loadDataOld() // Recargar datos
        setSuccess(`Jugador ${editingPlayer ? "actualizado" : "agregado"} exitosamente`)
        setActiveTab("players") // Navigate back to players tab
        setEditingPlayer(null) // Reset editing player
        setPlayerForm({ name: "", jersey_number: "", position: "QB", photo_url: "", team_id: "" }) // Reset form
        setError(null)
      } else {
        setError(data.message)
      }
    } catch (error) {
      console.error("💥 Error en createPlayer/updatePlayer:", error)
      setError(
        `Error al ${editingPlayer ? "actualizar" : "crear"} jugador: ` +
          (error instanceof Error ? error.message : "Error desconocido"),
      )
    }
  }

  // Función para crear cuenta de jugador con email y password manual
  const createPlayerAccount = async (player: Player, email: string, password: string) => {
    if (!email || !password) {
      setError("El correo y la contraseña son requeridos")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setCreatingAccount(player.id)
    setError(null)
    setPlayerCredentials(null)

    try {
      const response = await fetch("/api/auth/register-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: player.id,
          coach_user_id: user!.id,
          email: email,
          password: password,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setPlayerCredentials({
          player_id: player.id,
          player_name: player.name,
          email: email,
          password: password,
        })
        setSuccess("Cuenta creada exitosamente.")
        setShowAccountForm(null)
        setAccountForm({ email: "", password: "" })
        await loadDataOld()
      } else {
        setError(data.message || "Error al crear la cuenta")
      }
    } catch (error) {
      console.error("Error creando cuenta:", error)
      setError("Error al crear la cuenta del jugador")
    } finally {
      setCreatingAccount(null)
    }
  }

  // Función para copiar al portapapeles
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Error copiando:", err)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "team-logos")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setTeamForm((prev) => ({ ...prev, logo_url: data.url }))
        setSuccess("Logo subido exitosamente")
      } else {
        setError(data.message || "Error al subir el logo")
      }
    } catch (err) {
      setError("Error al subir el logo")
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ""
      }
    }
  }

  const handleCoachPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, teamId?: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCoachPhoto(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "coach-photos")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        if (teamId) {
          // Updating existing team
          const updateRes = await fetch("/api/teams", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: teamId,
              coach_photo_url: data.url,
              coach_name: user?.username || user?.name || user?.email || null,
            }),
          })
          const updateData = await updateRes.json()
          if (updateData.success) {
            setSuccess("Foto del coach actualizada exitosamente")
            await loadDataOld()
          } else {
            setError(updateData.message || "Error al actualizar la foto")
          }
        } else {
          // For new team creation form
          setCoachPhotoUrl(data.url)
          setSuccess("Foto del coach subida exitosamente")
        }
      } else {
        setError(data.message || "Error al subir la foto")
      }
    } catch (err) {
      setError("Error al subir la foto del coach")
    } finally {
      setUploadingCoachPhoto(false)
      if (coachPhotoInputRef.current) {
        coachPhotoInputRef.current.value = ""
      }
    }
  }

  const handlePayment = async (team: Team) => {
    setPayingTeam(team.id)
    setError(null)

    try {
      console.log("💳 Iniciando pago para equipo:", team.name)

      const response = await fetch("/api/payments/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: team.id,
          team_name: team.name,
          user_email: user?.email || "coach@ligaflagdurango.com",
          title: `Inscripción Liga Flag Durango - ${team.name}`,
          amount: 600,
        }),
      })

      const data = await response.json()
      console.log("💳 Respuesta MercadoPago:", data)

      if (data.success) {
        // Redirigir en la misma ventana en lugar de popup para evitar bloqueos
        const paymentUrl = data.data.init_point || data.data.sandbox_init_point
        if (paymentUrl) {
          window.location.href = paymentUrl
          setSuccess("Redirigiendo a MercadoPago para completar el pago...")
        } else {
          setError("No se pudo obtener la URL de pago")
        }
      } else {
        console.error("❌ Error en MercadoPago:", data)
        setError(`Error al crear el pago: ${data.message}`)
      }
    } catch (error) {
      console.error("💥 Error en pago:", error)
      setError("Error al procesar el pago: " + (error instanceof Error ? error.message : "Error de conexión"))
    } finally {
      setPayingTeam(null)
    }
  }

  const logout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      varonil_gold: "Varonil Gold",
      "varonil-gold": "Varonil Gold",
      varonil_silver: "Varonil Silver",
      "varonil-silver": "Varonil Silver",
      femenil_gold: "Femenil Gold",
      "femenil-gold": "Femenil Gold",
      femenil_silver: "Femenil Silver",
      "femenil-silver": "Femenil Silver",
      femenil_cooper: "Femenil Cooper",
      "femenil-cooper": "Femenil Cooper",
      mixto_gold: "Mixto Gold",
      "mixto-gold": "Mixto Gold",
      mixto_silver: "Mixto Silver",
      "mixto-silver": "Mixto Silver",
      teens: "Teens",
      "varonil-libre": "Varonil Libre",
      varonil_libre: "Varonil Libre",
      "varonil-gold": "Varonil Gold",
      varonil_gold: "Varonil Gold",
      "varonil-silver": "Varonil Silver",
      varonil_silver: "Varonil Silver",
      "mixto-recreativo": "Mixto Recreativo",
      mixto_recreativo: "Mixto Recreativo",
    }
    return labels[category] || category
  }

  const getPositionLabel = (position: string) => {
    const positions: { [key: string]: string } = {
      QB: "Quarterback",
      RB: "Running Back",
      WR: "Wide Receiver",
      TE: "Tight End",
      C: "Center",
      LB: "Linebacker",
      DB: "Defensive Back",
      S: "Safety",
      RU: "Rush",
      CB: "Corner Back",
    }
    return positions[position] || position
  }

  const getMyGames = () => {
    const myTeamNames = teams.map((t) => t.name)
    let filteredGames = games.filter((g) => myTeamNames.includes(g.home_team) || myTeamNames.includes(g.away_team))

    // Aplicar filtros
    if (gameFilter.status !== "all") {
      filteredGames = filteredGames.filter((g) => g.status === gameFilter.status)
    }
    if (gameFilter.category !== "all") {
      filteredGames = filteredGames.filter((g) => g.category === gameFilter.category)
    }
    if (gameFilter.team !== "all") {
      filteredGames = filteredGames.filter((g) => g.home_team === gameFilter.team || g.away_team === gameFilter.team)
    }

    return filteredGames
  }

  const getUpcomingGames = () => {
    const myTeamNames = teams.map((t) => t.name)
    return games
      .filter((g) => myTeamNames.includes(g.home_team) || myTeamNames.includes(g.away_team))
      .filter((g) => g.status === "programado")
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .slice(0, 5)
  }

  const getRecentResults = () => {
    const myTeamNames = teams.map((t) => t.name)
    return games
      .filter((g) => myTeamNames.includes(g.home_team) || myTeamNames.includes(g.away_team))
      .filter((g) => g.status === "finalizado")
      .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.date_date).getTime())
      .slice(0, 5)
  }

  const getMyPlayers = () => {
    const myTeamIds = teams.map((t) => t.id)
    return players.filter((p) => myTeamIds.includes(p.team_id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-xl">Cargando dashboard...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-xl">Acceso no autorizado</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Responsive */}
      <section className="relative py-12 md:py-20 overflow-hidden bg-gradient-to-r from-blue-500 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block bg-green-400/95 backdrop-blur-sm text-gray-900 px-4 md:px-6 py-2 rounded-full font-bold mb-4 md:mb-6 text-sm md:text-base">
              {"🏈 Dashboard Coach - Liga Flag Durango"}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Dashboard
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Coach
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-6 md:mb-8 leading-relaxed px-4">
              Bienvenido, <span className="text-yellow-300 font-semibold">{user.name || user.email}</span>
              <span className="block mt-2">Gestiona tu equipo y jugadores desde aquí.</span>
            </p>

            {/* Botones de navegación - Responsive */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold text-sm md:text-base"
                onClick={() => (window.location.href = "/coach-dashboard")}
              >
                <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Mi Dashboard
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-sm md:text-base"
                onClick={() => (window.location.href = "/")}
              >
                Ir al Inicio
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient separator */}
      <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-600 to-orange-500" />

      {/* Main Content - Responsive Grid */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Sidebar - Responsive */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Panel de Control</h2>

              {/* Navigation - Stack on mobile */}
              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  📊 Resumen General
                </button>
                <button
                  onClick={() => setActiveTab("teams")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "teams"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  🏈 Mis Equipos ({teams.length})
                </button>
                <button
                  onClick={() => setActiveTab("players")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "players"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  👥 Jugadores ({getMyPlayers().length})
                </button>
                <button
                  onClick={() => setActiveTab("games")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "games"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  🎯 Partidos ({getMyGames().length})
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "create"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  ➕ Crear Equipo
                </button>
                <button
                  onClick={() => setActiveTab("championships")}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                    activeTab === "championships"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  🏆 Campeonatos
                </button>
                {teams.length > 0 && (
                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base flex items-center justify-between ${
                      activeTab === "requests"
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      Solicitudes
                    </span>
                    {pendingJoinRequests.length > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "requests"
                          ? "bg-white text-blue-600"
                          : "bg-red-500 text-white"
                      }`}>
                        {pendingJoinRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* User Info - Responsive */}
              <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <div className="text-gray-600 text-xs md:text-sm">
                  <p className="break-all">👤 {user.email}</p>
                  <p>🎖️ Coach</p>
                </div>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="mt-3 md:mt-4 w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-xs md:text-sm bg-transparent"
                >
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area - Responsive */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm min-h-[400px] md:min-h-[600px]">
              {/* Mensajes de estado */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Resumen General</h2>

                  {/* Stats Cards - Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-4 text-center">
                        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <h3 className="text-2xl font-bold text-gray-900">{teams.length}</h3>
                        <p className="text-gray-600 text-sm">Equipos</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <h3 className="text-2xl font-bold text-gray-900">{getMyPlayers().length}</h3>
                        <p className="text-gray-600 text-sm">Jugadores</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <h3 className="text-2xl font-bold text-gray-900">{getMyGames().length}</h3>
                        <p className="text-gray-600 text-sm">Partidos</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pending Join Requests Alert */}
                  {pendingJoinRequests.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full">
                          <Inbox className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-900">
                            {pendingJoinRequests.length} solicitud{pendingJoinRequests.length !== 1 ? "es" : ""} pendiente{pendingJoinRequests.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-amber-700 text-sm">Jugadores quieren unirse a tu equipo</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setActiveTab("requests")}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Ver Solicitudes
                      </Button>
                    </div>
                  )}

                  {/* Quick Actions - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">Próximos Partidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {getUpcomingGames().length > 0 ? (
                          <div className="space-y-2">
                            {getUpcomingGames()
                              .slice(0, 3)
                              .map((game) => (
                                <div key={game.id} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                                  <div className="font-medium">
                                    {game.home_team} vs {game.away_team}
                                  </div>
                                  <div className="text-gray-600">
                                    {game.game_date} - {game.game_time}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No hay partidos programados</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">Resultados Recientes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {getRecentResults().length > 0 ? (
                          <div className="space-y-2">
                            {getRecentResults()
                              .slice(0, 3)
                              .map((game) => (
                                <div key={game.id} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                                  <div className="font-medium">
                                    {game.home_team} vs {game.away_team}
                                  </div>
                                  <div className="text-gray-600">
                                    {game.home_score} - {game.away_score}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No hay resultados recientes</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Teams Tab */}
              {activeTab === "teams" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Mis Equipos</h2>
                    <Button
                      onClick={() => setActiveTab("create")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Equipo
                    </Button>
                  </div>

                  {teams.length === 0 ? (
                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-8 text-center">
                        <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes equipos</h3>
                        <p className="text-gray-600 mb-4">Crea tu primer equipo para comenzar</p>
                        <Button onClick={() => setActiveTab("create")} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Equipo
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {teams.map((team) => (
                        <Card key={team.id} className="bg-white border-gray-200">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                {team.logo_url ? (
                                  <img
                                    src={team.logo_url}
                                    alt={`Logo ${team.name}`}
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                    style={{ background: `linear-gradient(135deg, ${team.color1}, ${team.color2})` }}
                                  >
                                    {team.name?.charAt(0) || "?"}
                                  </div>
                                )}
                                <div>
                                  <CardTitle className="text-gray-900 text-lg">{team.name}</CardTitle>
                                  <p className="text-gray-600 text-sm">{getCategoryLabel(team.category)}</p>
                                </div>
                              </div>
                              <Badge className={team.paid ? "bg-green-600" : "bg-yellow-600"}>
                                {team.paid ? "Pagado" : "Pendiente"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 text-sm text-gray-700">
                              {/* Coach Photo */}
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="relative">
                                  {team.coach_photo_url ? (
                                    <img
                                      src={team.coach_photo_url}
                                      alt="Foto del coach"
                                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-300"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                      <Users className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">Coach: {team.coach_name || user?.name || user?.email}</p>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handleCoachPhotoUpload(e, team.id)}
                                    className="hidden"
                                    id={`coach-photo-${team.id}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`coach-photo-${team.id}`)?.click()}
                                    disabled={uploadingCoachPhoto}
                                    className="mt-1 h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                  >
                                    {uploadingCoachPhoto ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                                    {team.coach_photo_url ? "Cambiar foto" : "Subir foto"}
                                  </Button>
                                </div>
                              </div>

                              {/* Logo Edit */}
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="relative">
                                  {team.logo_url ? (
                                    <img
                                      src={team.logo_url}
                                      alt="Logo del equipo"
                                      className="w-12 h-12 rounded-lg object-cover border-2 border-gray-300"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                                      style={{ background: `linear-gradient(135deg, ${team.color1}, ${team.color2})` }}
                                    >
                                      {team.name?.charAt(0) || "?"}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-xs">Logo del Equipo</p>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file) return
                                      setUploadingLogo(true)
                                      try {
                                        const formData = new FormData()
                                        formData.append("file", file)
                                        formData.append("folder", "team-logos")
                                        const res = await fetch("/api/upload", { method: "POST", body: formData })
                                        const data = await res.json()
                                        if (data.success) {
                                          await fetch("/api/teams", {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ id: team.id, logo_url: data.url }),
                                          })
                                          setSuccess("Logo actualizado exitosamente")
                                          await loadDataOld()
                                        } else {
                                          setError(data.message || "Error al subir el logo")
                                        }
                                      } catch {
                                        setError("Error al subir el logo")
                                      } finally {
                                        setUploadingLogo(false)
                                        e.target.value = ""
                                      }
                                    }}
                                    className="hidden"
                                    id={`team-logo-${team.id}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`team-logo-${team.id}`)?.click()}
                                    disabled={uploadingLogo}
                                    className="mt-1 h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                  >
                                    {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                                    {team.logo_url ? "Cambiar logo" : "Subir logo"}
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <span className="text-gray-600">Capitan:</span> {team.captain_name || "No asignado"}
                              </div>
                              <div>
                                <span className="text-gray-600">Telefono:</span> {team.captain_phone || "No asignado"}
                              </div>
                              <div className="flex items-center gap-2 mt-4">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: team.color1 }}
                                ></div>
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: team.color2 }}
                                ></div>
                                <span className="text-gray-600 text-xs">Colores del equipo</span>
                              </div>
                            </div>

                            {!team.paid && (
                              <div className="mt-4">
                                <Button
                                  onClick={() => handlePayment(team)}
                                  disabled={payingTeam === team.id}
                                  className="w-full bg-green-600 hover:bg-green-700"
                                >
                                  {payingTeam === team.id ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                                      Procesando...
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Pagar Inscripción ($600)
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Equipos disponibles para asignar */}
                  {potentialMatches.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Equipos Disponibles para Asignar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {potentialMatches.slice(0, 4).map((match) => (
                          <Card key={match.team_id} className="bg-white border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-900">{match.team_name}</h4>
                                <Badge className="bg-blue-600 text-xs">Score: {match.similarity_score}</Badge>
                              </div>
                              <p className="text-gray-600 text-sm mb-3">Capitán: {match.captain_name}</p>
                              <Button
                                onClick={() => assignSpecificTeam(match.team_id)}
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                Asignar a mi cuenta
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {potentialMatches.length > 0 && (
                        <div className="mt-4 text-center">
                          <Button
                            onClick={autoAssignBestMatches}
                            disabled={autoAssigning}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {autoAssigning ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Asignando...
                              </>
                            ) : (
                              <>
                                <Target className="w-4 h-4 mr-2" />
                                Auto-asignar Mejores Matches
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Players Tab */}
              {activeTab === "players" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Mis Jugadores</h2>
                    {teams.length > 0 && (
                      <Button
                        onClick={() => {
                          setActiveTab("add-player")
                          setPlayerForm({ name: "", jersey_number: "", position: "QB", photo_url: "", team_id: "" }) // Reset form when switching to add player
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Jugador
                      </Button>
                    )}
                  </div>

                  {getMyPlayers().length === 0 ? (
                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-8 text-center">
                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes jugadores</h3>
                        <p className="text-gray-600 mb-4">
                          {teams.length === 0
                            ? "Primero crea un equipo para agregar jugadores"
                            : "Agrega jugadores a tu equipo"}
                        </p>
                        {teams.length > 0 && (
                          <Button onClick={() => setActiveTab("add-player")} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Jugador
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getMyPlayers().map((player) => {
                        const team = teams.find((t) => t.id === player.team_id)
                        return (
                          <Card key={player.id} className="bg-white border-gray-200">
                            <CardContent className="p-4">
                              <div className="mb-4 flex justify-center">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url || "/placeholder.svg"}
                                    alt={player.name}
                                    className="w-48 h-48 rounded-full object-cover border-4 border-gray-300 shadow-lg"
                                    onError={(e) => {
                                      e.currentTarget.src = "/placeholder.svg?height=192&width=192"
                                    }}
                                  />
                                ) : (
                                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-300 shadow-lg">
                                    <span className="text-5xl font-bold text-white">{player.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-center mb-3">
                                <h4 className="font-bold text-gray-900 text-lg">{player.name}</h4>
                                <p className="text-gray-600 text-sm">{getPositionLabel(player.position)}</p>
                                {player.jersey_number && (
                                  <Badge className="bg-blue-600 mt-2">#{player.jersey_number}</Badge>
                                )}
                              </div>
                              <p className="text-gray-600 text-xs text-center mb-3">
                                Equipo: {team?.name || "Sin equipo"}
                              </p>
                              
                              {/* Estado de cuenta */}
                              <div className="text-center mb-3">
                                {player.user_id ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Check className="w-3 h-3 mr-1" />
                                    Tiene cuenta
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600">
                                    Sin cuenta
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-col gap-2">
                                {/* Botón crear cuenta si no tiene */}
                                {!player.user_id && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setShowAccountForm(player)
                                      setAccountForm({ email: "", password: "" })
                                    }}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Crear Cuenta
                                  </Button>
                                )}

                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                                    onClick={() => {
                                      setEditingPlayer(player)
                                      setPlayerForm({
                                        name: player.name,
                                        jersey_number: player.jersey_number?.toString() || "",
                                        position: player.position,
                                        photo_url: player.photo_url || "",
                                        team_id: player.team_id.toString(),
                                      })
                                      setActiveTab("edit-player")
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                                    onClick={() => {
                                      if (confirm(`¿Eliminar a ${player.name}?`)) {
                                        // TODO: Implement delete player API call
                                        console.log("Delete player:", player.id)
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Games Tab */}
              {activeTab === "games" && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Mis Partidos</h2>

                  {getMyGames().length === 0 ? (
                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-8 text-center">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes partidos</h3>
                        <p className="text-gray-600">Los partidos aparecerán aquí cuando sean programados</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {getMyGames().map((game) => (
                        <Card key={game.id} className="bg-white border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-lg">
                                  {game.home_team} vs {game.away_team}
                                </h4>
                                <p className="text-gray-600 text-sm">
                                  {getCategoryLabel(game.category)} • {game.game_date} • {game.game_time}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  {game.venue} - {game.field}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  className={
                                    game.status === "finalizado"
                                      ? "bg-gray-600"
                                      : game.status === "en_vivo"
                                        ? "bg-red-600"
                                        : "bg-blue-600"
                                  }
                                >
                                  {game.status === "finalizado"
                                    ? "Finalizado"
                                    : game.status === "en_vivo"
                                      ? "En Vivo"
                                      : "Programado"}
                                </Badge>
                                {game.status === "finalizado" && (
                                  <div className="text-gray-900 font-bold">
                                    {game.home_score} - {game.away_score}
                                  </div>
                                )}
                                {game.mvp && (
                                  <div className="flex items-center text-yellow-500 text-sm">
                                    <Star className="w-3 h-3 mr-1" />
                                    MVP: {game.mvp}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Create Team Tab */}
              {activeTab === "create" && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Crear Nuevo Equipo</h2>

                  <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                      <form onSubmit={createTeam} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-900">Nombre del Equipo</Label>
                            <Input
                              value={teamForm.name}
                              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Nombre del equipo"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-gray-900">Categoría</Label>
                            <select
                              value={teamForm.category}
                              onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                              className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                              required
                            >
                              <option value="">Seleccionar categoría</option>
                              <option value="varonil-libre">Varonil Libre</option>
                              <option value="varonil-gold">Varonil Gold</option>
                              <option value="varonil-silver">Varonil Silver</option>
                              <option value="femenil-gold">Femenil Gold</option>
                              <option value="femenil-silver">Femenil Silver</option>
                              <option value="femenil-cooper">Femenil Cooper</option>
                              <option value="mixto-gold">Mixto Gold</option>
                              <option value="mixto-silver">Mixto Silver</option>
                              <option value="mixto-recreativo">Mixto Recreativo</option>
                              <option value="teens">Teens</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-900">Nombre del Capitán</Label>
                            <Input
                              value={teamForm.captain_name}
                              onChange={(e) => setTeamForm({ ...teamForm, captain_name: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Nombre completo del capitán"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-gray-900">Teléfono del Capitán</Label>
                            <Input
                              value={teamForm.captain_phone}
                              onChange={(e) => setTeamForm({ ...teamForm, captain_phone: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Número de teléfono"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-900">Color Primario</Label>
                            <Input
                              type="color"
                              value={teamForm.color1}
                              onChange={(e) => setTeamForm({ ...teamForm, color1: e.target.value })}
                              className="bg-white border-gray-300 h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-gray-900">Color Secundario</Label>
                            <Input
                              type="color"
                              value={teamForm.color2}
                              onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                              className="bg-white border-gray-300 h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-900">Logo del Equipo (opcional)</Label>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          {teamForm.logo_url ? (
                            <div className="flex items-center gap-3 mt-2">
                              <img
                                src={teamForm.logo_url}
                                alt="Vista previa del logo"
                                className="w-16 h-16 rounded-lg object-cover border-2 border-gray-300"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => logoInputRef.current?.click()}
                                  disabled={uploadingLogo}
                                  className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar logo"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTeamForm({ ...teamForm, logo_url: "" })}
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-20 mt-2 border-dashed border-2 border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  <span>Subiendo...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-6 w-6" />
                                  <span>Subir logo del equipo</span>
                                </div>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Coach Photo */}
                        <div>
                          <Label className="text-gray-900">Foto del Coach (opcional)</Label>
                          <input
                            ref={coachPhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleCoachPhotoUpload(e)}
                            className="hidden"
                          />
                          {coachPhotoUrl ? (
                            <div className="flex items-center gap-3 mt-2">
                              <img
                                src={coachPhotoUrl}
                                alt="Vista previa foto del coach"
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => coachPhotoInputRef.current?.click()}
                                  disabled={uploadingCoachPhoto}
                                  className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                  {uploadingCoachPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar foto"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCoachPhotoUrl("")}
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-20 mt-2 border-dashed border-2 border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                              onClick={() => coachPhotoInputRef.current?.click()}
                              disabled={uploadingCoachPhoto}
                            >
                              {uploadingCoachPhoto ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  <span>Subiendo...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-6 w-6" />
                                  <span>Subir foto del coach</span>
                                </div>
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Equipo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("overview")}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Add Player Tab */}
              {activeTab === "add-player" && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Agregar Jugador</h2>

                  <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                      <form onSubmit={createPlayer} className="space-y-4">
                        <div>
                          <Label className="text-gray-900">Equipo</Label>
                          <select
                            value={playerForm.team_id}
                            onChange={(e) => setPlayerForm({ ...playerForm, team_id: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
                          >
                            <option value="">Seleccionar equipo</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-900">Nombre del Jugador</Label>
                            <Input
                              value={playerForm.name}
                              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Nombre completo"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-gray-900">Número de Jersey</Label>
                            <Input
                              type="number"
                              value={playerForm.jersey_number}
                              onChange={(e) => setPlayerForm({ ...playerForm, jersey_number: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Número"
                              min="1"
                              max="99"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-900">Posición</Label>
                          <select
                            value={playerForm.position}
                            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
                          >
                            <option value="">Seleccionar posición</option>
                            <option value="QB">Quarterback (QB)</option>
                            <option value="RB">Running Back (RB)</option>
                            <option value="WR">Wide Receiver (WR)</option>
                            <option value="TE">Tight End (TE)</option>
                            <option value="C">Center (C)</option>
                            <option value="LB">Linebacker (LB)</option>
                            <option value="DB">Defensive Back (DB)</option>
                            <option value="S">Safety (S)</option>
                            <option value="RU">Rush (RU)</option>
                            <option value="CB">Corner Back (CB)</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-gray-900">URL de Foto (opcional)</Label>
                          <Input
                            value={playerForm.photo_url}
                            onChange={(e) => setPlayerForm({ ...playerForm, photo_url: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                            placeholder="https://ejemplo.com/foto.jpg"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Jugador
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("players")}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Edit Player Tab */}
              {activeTab === "edit-player" && editingPlayer && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Editar Jugador</h2>

                  <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                      <form onSubmit={createPlayer} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-900">Nombre del Jugador</Label>
                            <Input
                              value={playerForm.name}
                              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Nombre completo"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-gray-900">Número de Jersey</Label>
                            <Input
                              type="number"
                              value={playerForm.jersey_number}
                              onChange={(e) => setPlayerForm({ ...playerForm, jersey_number: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                              placeholder="Número"
                              min="1"
                              max="99"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-900">Posición</Label>
                          <select
                            value={playerForm.position}
                            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
                          >
                            <option value="">Seleccionar posición</option>
                            <option value="QB">Quarterback (QB)</option>
                            <option value="RB">Running Back (RB)</option>
                            <option value="WR">Wide Receiver (WR)</option>
                            <option value="TE">Tight End (TE)</option>
                            <option value="C">Center (C)</option>
                            <option value="LB">Linebacker (LB)</option>
                            <option value="DB">Defensive Back (DB)</option>
                            <option value="S">Safety (S)</option>
                            <option value="RU">Rush (RU)</option>
                            <option value="CB">Corner Back (CB)</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-gray-900">Equipo</Label>
                          <select
                            value={playerForm.team_id}
                            onChange={(e) => setPlayerForm({ ...playerForm, team_id: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
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
                          <Label className="text-gray-900">URL de Foto (opcional)</Label>
                          <Input
                            value={playerForm.photo_url}
                            onChange={(e) => setPlayerForm({ ...playerForm, photo_url: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                            placeholder="https://ejemplo.com/foto.jpg"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                            <Edit className="w-4 h-4 mr-2" />
                            Guardar Cambios
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setActiveTab("players")
                              setEditingPlayer(null)
                              setPlayerForm({ name: "", jersey_number: "", position: "", photo_url: "", team_id: "" })
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === "requests" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Inbox className="w-6 h-6" />
                      Solicitudes de Ingreso
                    </h2>
                    {pendingJoinRequests.length > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        {pendingJoinRequests.length} pendiente{pendingJoinRequests.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {/* Pending Requests */}
                  {pendingJoinRequests.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Solicitudes Pendientes</h3>
                      {pendingJoinRequests.map((req) => (
                        <Card key={req.id} className="bg-white border-gray-200 overflow-hidden">
                          <div className={`h-1.5 ${req.is_transfer ? "bg-orange-400" : "bg-blue-400"}`} />
                          <CardContent className="p-4 md:p-5">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-gray-900 text-lg">{req.player_name}</h4>
                                  {req.is_transfer && (
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                      Transferencia
                                    </Badge>
                                  )}
                                  {req.requires_coordinator_approval && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                      Requiere Coordinador
                                    </Badge>
                                  )}
                                  {req.status === "pending_coordinator" && (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                      Esperando Coordinador
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-500 block">Posicion</span>
                                    <span className="text-gray-900 font-medium">{req.position}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">Numero</span>
                                    <span className="text-gray-900 font-medium">#{req.jersey_number}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">Equipo destino</span>
                                    <span className="text-gray-900 font-medium">{req.teams?.name || "Equipo #" + req.team_id}</span>
                                  </div>
                                  {req.phone && (
                                    <div>
                                      <span className="text-gray-500 block">Telefono</span>
                                      <span className="text-gray-900 font-medium">{req.phone}</span>
                                    </div>
                                  )}
                                </div>

                                {req.is_transfer && req.from_team_id && (
                                  <div className="text-sm bg-orange-50 p-2 rounded-lg border border-orange-100">
                                    <span className="text-orange-700">
                                      Viene del equipo: <strong>{allTeams.find(t => t.id === req.from_team_id)?.name || "Equipo #" + req.from_team_id}</strong>
                                      {" "}({allTeams.find(t => t.id === req.from_team_id)?.category || ""})
                                    </span>
                                  </div>
                                )}

                                {req.message && (
                                  <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 block mb-1">Mensaje:</span>
                                    <p className="text-gray-700 italic">{'"'}{req.message}{'"'}</p>
                                  </div>
                                )}

                                <p className="text-xs text-gray-400">
                                  Enviada el {new Date(req.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>

                              <div className="flex flex-row md:flex-col gap-2 shrink-0">
                                <Button
                                  onClick={() => handleJoinRequest(req.id, "accepted")}
                                  disabled={processingRequest === req.id}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                                >
                                  {processingRequest === req.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <UserCheck className="w-4 h-4 mr-1" />
                                  )}
                                  Aceptar
                                </Button>
                                <Button
                                  onClick={() => handleJoinRequest(req.id, "rejected")}
                                  disabled={processingRequest === req.id}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 md:flex-none"
                                >
                                  {processingRequest === req.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <UserX className="w-4 h-4 mr-1" />
                                  )}
                                  Rechazar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-white border-gray-200">
                      <CardContent className="p-8 text-center">
                        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">No hay solicitudes pendientes</h3>
                        <p className="text-gray-500 text-sm mt-1">Cuando un jugador solicite unirse a tu equipo, aparecera aqui.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Resolved Requests History */}
                  {resolvedJoinRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800">Historial de Solicitudes</h3>
                      <div className="space-y-2">
                        {resolvedJoinRequests.slice(0, 10).map((req) => (
                          <div
                            key={req.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                              req.status === "accepted"
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {req.status === "accepted" ? (
                                <UserCheck className="w-4 h-4 text-green-600" />
                              ) : (
                                <UserX className="w-4 h-4 text-red-600" />
                              )}
                              <div>
                                <span className="font-medium text-gray-900">{req.player_name}</span>
                                <span className="text-gray-500 ml-2">
                                  {req.position} - #{req.jersey_number}
                                  {req.is_transfer && " (Transferencia)"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-xs hidden sm:inline">
                                {req.teams?.name}
                              </span>
                              <Badge className={`text-xs ${
                                req.status === "accepted"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }`}>
                                {req.status === "accepted" ? "Aceptado" : "Rechazado"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Championships Tab */}
              {activeTab === "championships" && (
                <CoachChampionships teams={teams} coachId={user.id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear cuenta - Coach escribe email y password */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                Crear Cuenta para {showAccountForm.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">
                Escribe el correo y contraseña que deseas asignar a este jugador.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="player-email" className="text-gray-700">Correo electronico</Label>
                  <Input
                    id="player-email"
                    type="email"
                    placeholder="jugador@ejemplo.com"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="player-password" className="text-gray-700">Contraseña</Label>
                  <Input
                    id="player-password"
                    type="text"
                    placeholder="Minimo 6 caracteres"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">La contraseña sera visible para que puedas compartirla con el jugador.</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createPlayerAccount(showAccountForm, accountForm.email, accountForm.password)}
                  disabled={creatingAccount === showAccountForm.id || !accountForm.email || !accountForm.password}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {creatingAccount === showAccountForm.id ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Crear Cuenta
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAccountForm(null)
                    setAccountForm({ email: "", password: "" })
                  }}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Credenciales del Jugador */}
      {playerCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-green-600" />
                Cuenta Creada Exitosamente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">
                Se ha creado la cuenta para <strong>{playerCredentials.player_name}</strong>. 
                Comparte estas credenciales con el jugador para que pueda iniciar sesion y completar su perfil.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <Label className="text-gray-500 text-xs">Correo electronico</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2 rounded text-sm border text-gray-900 break-all">
                      {playerCredentials.email}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(playerCredentials.email, "email")}
                      className="shrink-0"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500 text-xs">Contrasena</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2 rounded text-sm border text-gray-900 font-mono">
                      {playerCredentials.password}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(playerCredentials.password, "password")}
                      className="shrink-0"
                    >
                      {copiedField === "password" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-amber-800 text-xs">
                  <strong>Importante:</strong> El jugador debe iniciar sesion en /login y completar su perfil 
                  subiendo su cedula y datos personales para verificar que esta en la categoria correcta.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const text = `Hola ${playerCredentials.player_name}!\n\nTu cuenta de jugador ha sido creada:\n\nCorreo: ${playerCredentials.email}\nContrasena: ${playerCredentials.password}\n\nInicia sesion en la pagina de la liga y completa tu perfil.`
                    copyToClipboard(text, "all")
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {copiedField === "all" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Todo
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPlayerCredentials(null)}
                  className="border-gray-300"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer CTA - Responsive */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-blue-500 via-purple-600 to-orange-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">¿Necesitas ayuda?</h2>
          <p className="text-white/90 text-base md:text-lg mb-6 md:mb-8 px-4">
            Contacta al administrador si tienes dudas sobre tu equipo o jugadores
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-sm md:text-base"
              onClick={() => (window.location.href = "/")}
            >
              <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Ir al Inicio
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-sm md:text-base"
              onClick={() => (window.location.href = "/partidos")}
            >
              Ver Partidos
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
