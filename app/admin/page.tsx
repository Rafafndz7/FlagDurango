"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  Edit,
  RefreshCw,
  Plus,
  Users,
  Trophy,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  UserCheck,
  Target,
  Star,
  FileImage,
  User,
  Eye,
  Shield,
  UserPlus,
  Key,
  Copy,
  Check,
  QrCode,
} from "lucide-react"
import AttendanceSection from "@/components/attendance-section"
import PlayerStatsAdmin from "@/components/player-stats-admin"
import QRScanner from "@/components/qr-scanner"
import PrintableQRSheet from "@/components/printable-qr-sheet"

type Team = {
  id?: any
  name: string
  category?: string
  logo_url?: string
  is_institutional?: boolean
  coordinator_name?: string
  coordinator_phone?: string
  captain_photo_url?: string
  captain_name?: string
  captain_phone?: string
  coach_name?: string
  coach_phone?: string
  coach_id?: number | null
  coach_photo_url?: string
  color1?: string
  color2?: string
  paid?: boolean
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

type Player = {
  id?: string
  team_id?: string
  name: string
  number?: string
  jersey_number?: number
  position?: string
  photo_url?: string
  user_id?: number
  birth_date?: string
  phone?: string
  personal_email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
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

interface Staff {
  id: number
  name: string
  role: string
  phone?: string
  email?: string
  can_edit_games: boolean
  can_edit_scores: boolean
  can_manage_payments: boolean
  user?: { username: string; email: string; status: string }
  created_at?: string
}

interface Referee {
  id: number
  name: string
  phone?: string
  email?: string
  license_number?: string
  certification_level: string
  experience_level?: string
  hourly_rate: number
  status?: string
  user?: { username: string; email: string; status: string }
  created_at?: string
}

interface Payment {
  id: number
  type?: string
  amount: number
  description: string
  team_id?: number
  referee_id?: number
  player_id?: number
  status: string
  due_date: string
  paid_date?: string
  team?: { name: string }
  referee?: { name: string }
  player?: { name: string }
  created_at?: string
  payment_type?: string
}

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  referee1?: string
  referee2?: string
  status: string
  home_score?: number
  away_score?: number
  match_type?: string
  created_at?: string
  mvp?: string
  game_type?: string
}

interface NewsArticle {
  id: number
  title: string
  content: string
  author: string
  image_url?: string
  created_at: string
}

interface Venue {
  id: number
  name: string
  address: string
  created_at: string
}

interface Field {
  id: number
  name: string
  venue_id: number
  capacity: number
  venue?: { name: string }
  created_at: string
}

interface User {
  id: number
  username: string
  email: string
  role: string
  status: string
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

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [referees, setReferees] = useState<Referee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [coachPermissions, setCoachPermissions] = useState<CoachPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("teams")
  const [wildbrowlEnabled, setWildbrowlEnabled] = useState<boolean>(false)
  const [gamesCategoryFilter, setGamesCategoryFilter] = useState<string>("")
  const [systemConfig, setSystemConfig] = useState<{ [key: string]: string }>({})
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
  const [editTeamData, setEditTeamData] = useState<any>({})
  const [coachAccounts, setCoachAccounts] = useState<{ id: number; username: string; email: string; role: string }[]>([])
  const [creatingAccount, setCreatingAccount] = useState<number | null>(null)
  const [playerCredentials, setPlayerCredentials] = useState<{
    player_id: number
    player_name: string
    email: string
    password: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showAccountForm, setShowAccountForm] = useState<Player | null>(null)
  const [accountForm, setAccountForm] = useState({ email: "", password: "" })

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: "",
    category: "varonil-libre",
    captain_name: "",
    captain_phone: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    logo_url: "",
    captain_photo_url: "",
    is_institutional: false,
    coordinator_name: "",
    coordinator_phone: "",
    color1: "#3B82F6",
    color2: "#1E40AF",
  })

  const [quickPlayer, setQuickPlayer] = useState({
    name: "",
    jersey_number: "",
    position: "",
    team_id: "",
  })

  const [playerForm, setPlayerForm] = useState({
    name: "",
    jersey_number: "",
    position: "",
    team_id: "",
    photo_url: "",
  })

  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "staff",
    phone: "",
    email: "",
    password: "",
    can_edit_games: false,
    can_edit_scores: false,
    can_manage_payments: false,
  })

  const [refereeForm, setRefereeForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    license_number: "",
    certification_level: "junior",
    hourly_rate: "",
  })

  const [paymentForm, setPaymentForm] = useState({
    type: "team_registration",
    amount: "",
    description: "",
    team_id: "",
    referee_id: "",
    player_id: "",
    status: "pending",
    due_date: "",
  })

  // Nuevo formulario para deudas específicas
  const [debtForm, setDebtForm] = useState({
    team_id: "",
    amount: "",
    description: "",
    type: "arbitraje", // arbitraje, fianza, multa, otros
    due_date: "",
    game_reference: "", // Para referenciar un partido específico
  })

  const [gameForm, setGameForm] = useState({
    home_team: "",
    away_team: "",
    game_date: "",
    game_time: "",
    venue: "",
    field: "",
    category: "varonil-libre",
    referee1: "",
    referee2: "",
    status: "programado",
    home_score: "",
    away_score: "",
    match_type: "jornada",
    game_type: "flag", // Asegurar que siempre tenga un valor por defecto
    mvp: "",
  })

  const [newsForm, setNewsForm] = useState({
    title: "",
    content: "",
    author: "Admin Liga",
    image_url: "",
  })

  const [showPasswords, setShowPasswords] = useState({
    staff: false,
    referee: false,
  })

  const [editingGame, setEditingGame] = useState<Game | null>(null)

  const [newTeam, setNewTeam] = useState<Team>({
    name: "",
    category: "",
    logo_url: "",
    is_institutional: false,
    coordinator_name: "",
    coordinator_phone: "",
    captain_photo_url: "",
  })

  const [newPlayer, setNewPlayer] = useState<Player>({
    name: "",
    number: "",
    position: "",
    photo_url: "",
    team_id: "",
  })

  const canCreatePlayer = useMemo(() => !!newPlayer.team_id, [newPlayer.team_id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamsRes, playersRes, staffRes, refereesRes, paymentsRes, gamesRes, newsRes, venuesRes, fieldsRes, cRes] =
        await Promise.all([
          fetch("/api/teams", { cache: "no-store" }),
          fetch("/api/players", { cache: "no-store" }),
          fetch("/api/staff"),
          fetch("/api/referees"),
          fetch("/api/payments"),
          fetch("/api/games"),
          fetch("/api/news"),
          fetch("/api/venues"),
          fetch("/api/fields"),
          fetch("/api/system-config", { cache: "no-store" }),
        ])

      const [
        teamsData,
        playersData,
        staffData,
        refereesData,
        paymentsData,
        gamesData,
        newsData,
        venuesData,
        fieldsData,
        cfg,
      ] = await Promise.all([
        teamsRes.json(),
        playersRes.json(),
        staffRes.json(),
        refereesRes.json(),
        paymentsRes.json(),
        gamesRes.json(),
        newsRes.json(),
        venuesRes.json(),
        fieldsRes.json(),
        cRes.json(),
      ])

      if (teamsData.success) setTeams(teamsData.data || [])
      if (playersData.success) setPlayers(playersData.data || [])
      if (staffData.success) setStaff(staffData.data || [])
      if (refereesData.success) setReferees(refereesData.data || [])
      if (paymentsData.success) setPayments(paymentsData.data || [])
      if (gamesData.success) setGames(gamesData.data || [])
      if (newsData.success) setNews(newsData.data || [])
      if (venuesData.success) setVenues(venuesData.data || [])
      if (fieldsData.success) setFields(fieldsData.data || [])
      setWildbrowlEnabled(Boolean(cfg?.wildbrowl_enabled))
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem("user")
        if (!userData) {
          console.log("No hay usuario en localStorage, redirigiendo a login")
          router.push("/login")
          return
        }

        const parsedUser = JSON.parse(userData)
        console.log("Usuario encontrado:", parsedUser)

        if (parsedUser.role !== "admin") {
          console.log("Usuario no es admin, redirigiendo")
          router.push("/")
          return
        }

        setUser(parsedUser)
        console.log("Usuario admin autenticado correctamente")
      } catch (error) {
        console.error("Error verificando autenticación:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

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
      const [teamsRes, playersRes, gamesRes, paymentsRes, venuesRes, fieldsRes] = await Promise.all([
        fetch("/api/teams").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/players").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/games").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/payments").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/venues").catch(() => ({ json: () => ({ success: false, data: [] }) })),
        fetch("/api/fields").catch(() => ({ json: () => ({ success: false, data: [] }) })),
      ])

      const [teamsData, playersData, gamesData, paymentsData, venuesData, fieldsData] = await Promise.all([
        teamsRes.json(),
        playersRes.json(),
        gamesRes.json(),
        paymentsRes.json(),
        venuesRes.json(),
        fieldsRes.json(),
      ])

      if (teamsData.success) setTeams(teamsData.data)
      if (playersData.success) setPlayers(playersData.data || [])
      if (gamesData.success) setGames(gamesData.data)
      if (paymentsData.success) setPayments(paymentsData.data)
      if (venuesData.success) setVenues(venuesData.data)
      if (fieldsData.success) setFields(fieldsData.data)

      // Cargar cuentas de coach/usuario para asignacion
      try {
        const usersRes = await fetch("/api/users")
        const usersData = await usersRes.json()
        if (usersData.success) {
          setCoachAccounts(usersData.data.filter((u: any) => u.role === "coach" || u.role === "admin" || u.role === "user"))
        }
      } catch {}

      await loadSystemConfig()
      await loadCoachPermissions()
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Función para crear cuenta de jugador con email y password manual
  const createPlayerAccount = async (player: Player, email: string, password: string) => {
    if (!email || !password) {
      alert("El correo y la contraseña son requeridos")
      return
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setCreatingAccount(Number(player.id))

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
          player_id: Number(player.id),
          player_name: player.name,
          email: email,
          password: password,
        })
        setShowAccountForm(null)
        setAccountForm({ email: "", password: "" })
        await loadData()
      } else {
        alert(data.message || "Error al crear la cuenta")
      }
    } catch (error) {
      console.error("Error creando cuenta:", error)
      alert("Error al crear la cuenta del jugador")
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
    } catch (error) {
      console.error("Error copying to clipboard:", error)
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
          category: "varonil-libre",
          captain_name: "",
          captain_phone: "",
          contact_name: "",
          contact_phone: "",
          contact_email: "",
          logo_url: "",
          captain_photo_url: "",
          is_institutional: false,
          coordinator_name: "",
          coordinator_phone: "",
          color1: "#3B82F6",
          color2: "#1E40AF",
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

  // Nueva función para crear deudas específicas
  const createSpecificDebt = async () => {
    try {
      if (!debtForm.team_id || !debtForm.amount || !debtForm.description || !debtForm.due_date) {
        alert("Todos los campos son requeridos")
        return
      }

      let finalDescription = debtForm.description

      // Agregar referencia del partido si es arbitraje y se especificó
      if (debtForm.type === "arbitraje" && debtForm.game_reference) {
        finalDescription = `${debtForm.description} - Partido: ${debtForm.game_reference}`
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: debtForm.type,
          amount: Number.parseFloat(debtForm.amount),
          description: finalDescription,
          team_id: Number.parseInt(debtForm.team_id),
          status: "pending",
          due_date: debtForm.due_date,
          payment_type: debtForm.type,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setDebtForm({
          team_id: "",
          amount: "",
          description: "",
          type: "arbitraje",
          due_date: "",
          game_reference: "",
        })
        loadData()
        alert("Deuda registrada exitosamente")
      } else {
        alert(data.message || "Error al registrar deuda")
      }
    } catch (error) {
      console.error("Error creating debt:", error)
      alert("Error al registrar deuda")
    }
  }

  const handleDelete = async (type: string, id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este elemento?")) return

    try {
      const response = await fetch(`/api/${type}?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        switch (type) {
          case "teams":
            setTeams(teams.filter((item) => item.id !== id))
            break
          case "players":
            setPlayers(players.filter((item) => item.id !== id))
            break
          case "staff":
            setStaff(staff.filter((item) => item.id !== id))
            break
          case "referees":
            setReferees(referees.filter((item) => item.id !== id))
            break
          case "payments":
            setPayments(payments.filter((item) => item.id !== id))
            break
          case "games":
            setGames(games.filter((item) => item.id !== id))
            break
          case "news":
            setNews(news.filter((item) => item.id !== id))
            break
        }
        alert("Elemento eliminado exitosamente")
      } else {
        alert("Error: " + data.message)
      }
    } catch (error) {
      console.error("Error deleting:", error)
      alert("Error al eliminar")
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      programado: { color: "bg-blue-500", text: "Programado" },
      "en vivo": { color: "bg-red-500", text: "En Vivo" },
      finalizado: { color: "bg-green-500", text: "Finalizado" },
      pending: { color: "bg-yellow-500", text: "Pendiente" },
      paid: { color: "bg-green-500", text: "Pagado" },
      overdue: { color: "bg-red-500", text: "Vencido" },
      active: { color: "bg-green-500", text: "Activo" },
      inactive: { color: "bg-gray-500", text: "Inactivo" },
    } as const

    const config = (statusConfig as any)[status] || {
      color: "bg-gray-500",
      text: status,
    }

    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>
  }

  async function createPlayer() {
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlayer),
    })
    if (res.ok) {
      const created = await res.json()
      setPlayers((prev) => [created, ...prev])
      setNewPlayer({ name: "", number: "", position: "", photo_url: "", team_id: newPlayer.team_id })
      alert("Jugador agregado")
    } else {
      const err = await res.text()
      alert("Error al agregar jugador: " + err)
    }
  }

  async function updatePlayerPhoto(playerId: string, photo_url: string) {
    const res = await fetch("/api/players", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playerId, photo_url }),
    })
    if (res.ok) {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, photo_url } : p)))
    } else {
      alert("No se pudo actualizar la foto")
    }
  }

  async function toggleWildbrowl() {
    const res = await fetch("/api/system-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wildbrowl_enabled: !wildbrowlEnabled }),
    })
    if (res.ok) {
      setWildbrowlEnabled((v) => !v)
    } else {
      alert("No se pudo actualizar WildBrowl")
    }
  }

  const createGame = async () => {
    try {
      console.log("🎮 Creando partido con datos:", gameForm)

      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameForm),
      })

      const data = await response.json()
      console.log("📤 Respuesta del servidor:", data)

      if (data.success) {
        setGameForm({
          home_team: "",
          away_team: "",
          game_date: "",
          game_time: "",
          venue: "",
          field: "",
          category: "varonil-libre",
          referee1: "",
          referee2: "",
          status: "programado",
          match_type: "jornada",
          game_type: "flag",
          mvp: "",
        })
        loadData()
        alert("Partido creado exitosamente")
      } else {
        console.error("❌ Error del servidor:", data.message)
        alert(data.message || "Error al crear partido")
      }
    } catch (error) {
      console.error("💥 Error creating game:", error)
      alert("Error al crear partido: " + (error instanceof Error ? error.message : "Error desconocido"))
    }
  }

  const updateGameStatus = async (
    id: number,
    status: string,
    home_score?: number,
    away_score?: number,
    mvp?: string,
    referee1?: string,
    referee2?: string,
  ) => {
    try {
      const updateData: any = { id, status }
      if (home_score !== undefined) updateData.home_score = home_score
      if (away_score !== undefined) updateData.away_score = away_score
      if (mvp) updateData.mvp = mvp
      if (referee1 !== undefined) updateData.referee1 = referee1
      if (referee2 !== undefined) updateData.referee2 = referee2

      const response = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
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
          type: "team_registration",
          amount: "",
          description: "",
          team_id: "",
          referee_id: "",
          player_id: "",
          status: "pending",
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
      console.error("Error updating payment:", error)
    }
  }

  const logout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl">Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-gray-600">Bienvenido, {user.username}</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar
            </Button>
            <Button onClick={updateStats} disabled={updating} className="bg-green-600 hover:bg-green-700 text-white">
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? "animate-spin" : ""}`} />
              {updating ? "Actualizando..." : "Actualizar Estadísticas"}
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="text-gray-900 border-gray-300 hover:bg-gray-100"
            >
              Ver Sitio
            </Button>
            <Button onClick={logout} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
              Cerrar Sesión
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Fusionar Categorías Varoniles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 mb-2">
                  Fusiona las categorías Varonil Gold y Varonil Silver en una sola categoría "Varonil Libre"
                </p>
                <p className="text-sm text-orange-600">
                  ⚠️ Esta acción no se puede deshacer. Afectará equipos, juegos y estadísticas.
                </p>
              </div>
              <Button
                onClick={async () => {
                  if (!confirm("¿Estás seguro de fusionar las categorías varoniles? Esta acción no se puede deshacer."))
                    return

                  try {
                    const response = await fetch("/api/admin/merge-varonil", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    })

                    const data = await response.json()

                    if (data.success) {
                      alert(
                        `Fusión exitosa: ${data.data.equipos_actualizados} equipos y ${data.data.juegos_actualizados} juegos actualizados`,
                      )
                      loadData()
                    } else {
                      alert("Error: " + data.message)
                    }
                  } catch (error) {
                    alert("Error de conexión")
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Fusionar Categorías
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-12 bg-white border border-gray-200">
            <TabsTrigger
              value="teams"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Equipos
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <User className="w-4 h-4 mr-2" />
              Jugadores
            </TabsTrigger>
            <TabsTrigger
              value="games"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Partidos
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger
              value="debts"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Deudas
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Target className="w-4 h-4 mr-2" />
              Estadisticas
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendario
            </TabsTrigger>
            <TabsTrigger
              value="coaches"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Entrenadores
            </TabsTrigger>
            <TabsTrigger
              value="wildbrowl"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Target className="w-4 h-4 mr-2" />
              WildBrowl
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
            <TabsTrigger
              value="mvps"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <Star className="w-4 h-4 mr-2" />
              MVPs
            </TabsTrigger>
            <TabsTrigger
              value="qr"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-700"
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR
            </TabsTrigger>
          </TabsList>

          {/* Equipos */}
          <TabsContent value="teams">
            <div className="grid gap-6">
              {/* Crear equipo */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear Nuevo Equipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Nombre del Equipo (sin sufijo)</Label>
                      <Input
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Ej: Wildcats (se agregará VL automáticamente)"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Se agregará automáticamente el sufijo según la categoría (VL, FG, FS, etc.)
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-700">Categoría</Label>
                      <select
                        value={teamForm.category}
                        onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="varonil-libre">Varonil Libre (VL)</option>
                        <option value="varonil-gold">Varonil Gold (VG)</option>
                        <option value="varonil-silver">Varonil Silver (VS)</option>
                        <option value="femenil-gold">Femenil Gold (FG)</option>
                        <option value="femenil-silver">Femenil Silver (FS)</option>
                        <option value="mixto-gold">Mixto Gold (MG)</option>
                        <option value="mixto-silver">Mixto Silver (MS)</option>
                        <option value="femenil-cooper">Femenil Cooper (FC)</option>
                        <option value="mixto-recreativo">Mixto Recreativo (MR)</option>
                        <option value="teens">Teens (T)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Color 1</Label>
                      <Input
                        type="color"
                        value={teamForm.color1}
                        onChange={(e) => setTeamForm({ ...teamForm, color1: e.target.value })}
                        className="bg-white border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Color 2</Label>
                      <Input
                        type="color"
                        value={teamForm.color2}
                        onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                        className="bg-white border-gray-300"
                      />
                    </div>
                  </div>
                  <Button onClick={createTeam} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Crear Equipo
                  </Button>
                </CardContent>
              </Card>

              {/* Agregar Jugador Rápido */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar Jugador Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Nombre</Label>
                      <Input
                        value={quickPlayer.name}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, name: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Nombre del jugador"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Número</Label>
                      <Input
                        type="number"
                        value={quickPlayer.jersey_number}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, jersey_number: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Posición</Label>
                      <select
                        value={quickPlayer.position}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, position: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="">Seleccionar posición</option>
                        <option value="QB">Quarterback (QB)</option>
                        <option value="RB">Running Back (RB)</option>
                        <option value="WR">Wide Receiver (WR)</option>
                        <option value="TE">Tight End (TE)</option>
                        <option value="RU">Rush (RU)</option>
                        <option value="LB">Linebacker (LB)</option>
                        <option value="DB">Defensive Back (DB)</option>
                        <option value="CB">Corner Back (CB)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Equipo</Label>
                      <select
                        value={quickPlayer.team_id}
                        onChange={(e) => setQuickPlayer({ ...quickPlayer, team_id: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
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
                  <Button onClick={createQuickPlayer} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    Agregar Jugador
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de equipos con edicion */}
              <div className="grid gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="bg-white border border-gray-200">
                    <CardContent className="p-4">
                      {editingTeamId === team.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-gray-700">Nombre del Equipo</Label>
                              <Input
                                value={editTeamData.name || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, name: e.target.value })}
                                className="bg-white border-gray-300 text-gray-900"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Categoria</Label>
                              <select
                                value={editTeamData.category || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, category: e.target.value })}
                                className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                              >
                                <option value="varonil-libre">Varonil Libre (VL)</option>
                                <option value="varonil-gold">Varonil Gold (VG)</option>
                                <option value="varonil-silver">Varonil Silver (VS)</option>
                                <option value="femenil-gold">Femenil Gold (FG)</option>
                                <option value="femenil-silver">Femenil Silver (FS)</option>
                                <option value="mixto-gold">Mixto Gold (MG)</option>
                                <option value="mixto-silver">Mixto Silver (MS)</option>
                                <option value="femenil-cooper">Femenil Cooper (FC)</option>
                                <option value="mixto-recreativo">Mixto Recreativo (MR)</option>
                                <option value="teens">Teens (T)</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-gray-700">Nombre del Coach</Label>
                              <Input
                                value={editTeamData.coach_name || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, coach_name: e.target.value })}
                                className="bg-white border-gray-300 text-gray-900"
                                placeholder="Nombre del coach"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Telefono del Coach</Label>
                              <Input
                                value={editTeamData.coach_phone || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, coach_phone: e.target.value })}
                                className="bg-white border-gray-300 text-gray-900"
                                placeholder="Telefono"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Asignar cuenta de Coach</Label>
                              <select
                                value={editTeamData.coach_id || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, coach_id: e.target.value ? Number(e.target.value) : null })}
                                className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                              >
                                <option value="">Sin asignar</option>
                                {coachAccounts.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.username} ({u.email}) - {u.role}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Asigna una cuenta existente como coach de este equipo</p>
                            </div>
                            <div>
                              <Label className="text-gray-700">Nombre del Capitan</Label>
                              <Input
                                value={editTeamData.captain_name || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, captain_name: e.target.value })}
                                className="bg-white border-gray-300 text-gray-900"
                                placeholder="Nombre del capitan"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Telefono del Capitan</Label>
                              <Input
                                value={editTeamData.captain_phone || ""}
                                onChange={(e) => setEditTeamData({ ...editTeamData, captain_phone: e.target.value })}
                                className="bg-white border-gray-300 text-gray-900"
                                placeholder="Telefono del capitan"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/teams", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: team.id, ...editTeamData }),
                                  })
                                  const data = await res.json()
                                  if (data.success) {
                                    setEditingTeamId(null)
                                    loadData()
                                  } else {
                                    alert("Error: " + data.message)
                                  }
                                } catch {
                                  alert("Error al guardar")
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingTeamId(null)}
                              className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
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
                              <h3 className="text-gray-900 font-semibold text-lg">{team.name}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-blue-600 text-white">{team.category}</Badge>
                                {team.paid && <Badge className="bg-green-600 text-white">Pagado</Badge>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                {team.coach_name && <div>Coach: {team.coach_name} {team.coach_phone ? `(${team.coach_phone})` : ""}</div>}
                                {team.captain_name && <div>Capitan: {team.captain_name} {team.captain_phone ? `(${team.captain_phone})` : ""}</div>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {team.stats && (
                              <div className="text-right text-gray-700 mr-4">
                                <div className="font-bold">{team.stats.points} pts</div>
                                <div className="text-sm text-gray-500">
                                  {team.stats.wins}W-{team.stats.losses}L-{team.stats.draws}D
                                </div>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTeamId(team.id)
                                setEditTeamData({
                                  name: team.name,
                                  category: team.category,
                                  coach_name: team.coach_name || "",
                                  coach_phone: team.coach_phone || "",
                                  coach_id: team.coach_id || null,
                                  captain_name: team.captain_name || "",
                                  captain_phone: team.captain_phone || "",
                                })
                              }}
                              className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteTeam(team.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Jugadores - Información Completa */}
          <TabsContent value="players">
            <div className="grid gap-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Información de Jugadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Revisa la información personal de los jugadores para verificar que están en la categoría correcta.
                  </p>
                  
                  {/* Lista de jugadores con información completa */}
                  <div className="space-y-4">
                    {players.map((player) => (
                      <Card key={player.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Foto del jugador */}
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-10 h-10 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Información principal */}
                            <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{player.name}</h3>
                                {(player.jersey_number || player.number) && (
                                  <p className="text-2xl font-bold text-blue-600">#{player.jersey_number || player.number}</p>
                                )}
                                <p className="text-sm text-gray-500">{player.position || "Sin posición"}</p>
                                {player.teams && (
                                  <Badge className="mt-1 bg-blue-100 text-blue-800">
                                    {player.teams.name}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1 text-sm">
                                <p className="text-gray-500">Datos personales</p>
                                {player.birth_date && (
                                  <p><span className="font-medium">Nacimiento:</span> {player.birth_date}</p>
                                )}
                                {player.phone && (
                                  <p><span className="font-medium">Tel:</span> {player.phone}</p>
                                )}
                                {player.personal_email && (
                                  <p><span className="font-medium">Email:</span> {player.personal_email}</p>
                                )}
                                {player.blood_type && (
                                  <p><span className="font-medium">Sangre:</span> {player.blood_type}</p>
                                )}
                              </div>

                              <div className="space-y-1 text-sm">
                                <p className="text-gray-500">Experiencia</p>
                                {player.seasons_played !== undefined && player.seasons_played !== null && (
                                  <p><span className="font-medium">Temporadas:</span> {player.seasons_played}</p>
                                )}
                                {player.playing_since && (
                                  <p><span className="font-medium">Desde:</span> {player.playing_since}</p>
                                )}
{player.emergency_contact_name && (
<p><span className="font-medium">Emergencia:</span> {player.emergency_contact_name}</p>
  )}
{player.emergency_contact_phone && (
<p><span className="font-medium">Tel emergencia:</span> {player.emergency_contact_phone}</p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="text-gray-500 text-sm">Estado</p>
                                <div className="flex flex-wrap gap-2">
                                  {player.profile_completed ? (
                                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Perfil completo
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Perfil incompleto
                                    </Badge>
                                  )}
                                  {player.admin_verified ? (
                                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      Verificado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      Sin verificar
                                    </Badge>
                                  )}
                                  {player.user_id ? (
                                    <Badge className="bg-blue-100 text-blue-800">Con cuenta</Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-600">Sin cuenta</Badge>
                                  )}
                                </div>

                                {/* Cédula */}
                                {player.cedula_url && (
                                  <a
                                    href={player.cedula_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    <FileImage className="w-4 h-4" />
                                    Ver cédula
                                  </a>
                                )}

                                {/* Botones de acción */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {!player.user_id && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setShowAccountForm(player)
                                        setAccountForm({ email: "", password: "" })
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      <UserPlus className="w-3 h-3 mr-1" />
                                      Crear Cuenta
                                    </Button>
                                  )}
                                  {!player.admin_verified && player.profile_completed && (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        const res = await fetch("/api/players", {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ id: player.id, admin_verified: true }),
                                        })
                                        if (res.ok) {
                                          loadData()
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Verificar
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete("players", Number(player.id))}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Condiciones médicas */}
                          {player.medical_conditions && (
                            <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                              <span className="font-medium text-red-700">Condiciones médicas:</span>{" "}
                              <span className="text-red-600">{player.medical_conditions}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {players.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay jugadores registrados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Asistencia a Partidos */}
              <AttendanceSection games={games} teams={teams} players={players} />
            </div>
          </TabsContent>

          {/* Nueva pestaña de Deudas Específicas */}
          <TabsContent value="debts">
            <div className="grid gap-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Registrar Deuda Específica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Equipo</Label>
                      <select
                        value={debtForm.team_id}
                        onChange={(e) => setDebtForm({ ...debtForm, team_id: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
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
                      <Label className="text-gray-700">Tipo de Deuda</Label>
                      <select
                        value={debtForm.type}
                        onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="arbitraje">Debe Arbitraje</option>
                        <option value="fianza">Debe Fianza</option>
                        <option value="multa">Multa</option>
                        <option value="otros">Otros</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Monto</Label>
                      <Input
                        type="number"
                        value={debtForm.amount}
                        onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="300"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Fecha límite</Label>
                      <Input
                        type="date"
                        value={debtForm.due_date}
                        onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-gray-700">Descripción</Label>
                      <Input
                        value={debtForm.description}
                        onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Ej: Debe arbitraje por no presentar árbitro"
                      />
                    </div>
                    {debtForm.type === "arbitraje" && (
                      <div className="col-span-2">
                        <Label className="text-gray-700">Referencia del Partido (opcional)</Label>
                        <Input
                          value={debtForm.game_reference}
                          onChange={(e) => setDebtForm({ ...debtForm, game_reference: e.target.value })}
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          placeholder="Ej: Wildcats VG vs Eagles VG - 15/08/2025"
                        />
                      </div>
                    )}
                  </div>
                  <Button onClick={createSpecificDebt} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    Registrar Deuda
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de deudas pendientes */}
              <div className="grid gap-4">
                {payments
                  .filter((p) => p.status === "pending")
                  .map((p) => (
                    <Card key={p.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white font-semibold">
                            {p.team?.name || p.player?.name || p.referee?.name || "Entidad"}
                          </div>
                          <div className="text-white/70 text-sm">
                            {p.payment_type || p.type} — ${p.amount.toFixed(2)} MXN
                          </div>
                          <div className="text-white/50 text-xs">{p.description}</div>
                          <div className="text-white/50 text-xs">Vence: {p.due_date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getPaymentStatusColor(p.status)} text-white flex items-center gap-1`}>
                            {getPaymentStatusIcon(p.status)}
                            {p.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(p.id, "paid")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Marcar Pagado
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete("payments", p.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* Resto de pestañas existentes... */}
          <TabsContent value="games">
            <div className="grid gap-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Programar Nuevo Partido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Tipo de Juego</Label>
                      <select
                        value={gameForm.game_type}
                        onChange={(e) => setGameForm({ ...gameForm, game_type: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="flag">Flag Football</option>
                        <option value="wildbrowl">WildBrowl 1v1</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Categoría</Label>
                      <select
                        value={gameForm.category}
                        onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="varonil-libre">Varonil Libre</option>
                        <option value="varonil-gold">Varonil Gold</option>
                        <option value="varonil-silver">Varonil Silver</option>
                        <option value="femenil-gold">Femenil Gold</option>
                        <option value="femenil-silver">Femenil Silver</option>
                        <option value="mixto-gold">Mixto Gold</option>
                        <option value="mixto-silver">Mixto Silver</option>
                        <option value="femenil-cooper">Femenil Cooper</option>
                        <option value="mixto-recreativo">Mixto Recreativo</option>
                        <option value="teens">Teens</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Tipo de Partido</Label>
                      <select
                        value={gameForm.match_type}
                        onChange={(e) => setGameForm({ ...gameForm, match_type: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                      >
                        <option value="jornada">Jornada</option>
                        <option value="semifinal">Semifinal</option>
                        <option value="final">Final</option>
                        <option value="amistoso">Amistoso</option>
                      </select>
                    </div>
                    <div />
                    {gameForm.game_type === "flag" ? (
                      <>
                        <div>
                          <Label className="text-gray-700">Equipo Local</Label>
                          <select
                            value={gameForm.home_team}
                            onChange={(e) => setGameForm({ ...gameForm, home_team: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
                          >
                            <option value="">Seleccionar equipo</option>
                            {teams
                              .filter((t) => t.category === gameForm.category)
                              .map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-700">Equipo Visitante</Label>
                          <select
                            value={gameForm.away_team}
                            onChange={(e) => setGameForm({ ...gameForm, away_team: e.target.value })}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
                            required
                          >
                            <option value="">Seleccionar equipo</option>
                            {teams
                              .filter((t) => t.category === gameForm.category)
                              .map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label className="text-gray-700">Jugador 1</Label>
                          <Input
                            value={gameForm.home_team}
                            onChange={(e) => setGameForm({ ...gameForm, home_team: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                            placeholder="Nombre del jugador 1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Jugador 2</Label>
                          <Input
                            value={gameForm.away_team}
                            onChange={(e) => setGameForm({ ...gameForm, away_team: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                            placeholder="Nombre del jugador 2"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <Label className="text-gray-700">Fecha</Label>
                      <Input
                        type="date"
                        value={gameForm.game_date}
                        onChange={(e) => setGameForm({ ...gameForm, game_date: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Hora</Label>
                      <Input
                        type="time"
                        value={gameForm.game_time}
                        onChange={(e) => setGameForm({ ...gameForm, game_time: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Sede</Label>
                      <Input
                        value={gameForm.venue}
                        onChange={(e) => setGameForm({ ...gameForm, venue: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Ej: Unidad Deportiva Norte"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Campo</Label>
                      <Input
                        value={gameForm.field}
                        onChange={(e) => setGameForm({ ...gameForm, field: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Ej: Campo A, Campo 1, etc."
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Árbitro Principal</Label>
                      <Input
                        value={gameForm.referee1}
                        onChange={(e) => setGameForm({ ...gameForm, referee1: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Nombre del árbitro principal"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Árbitro Asistente</Label>
                      <Input
                        value={gameForm.referee2}
                        onChange={(e) => setGameForm({ ...gameForm, referee2: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Nombre del árbitro asistente (opcional)"
                      />
                    </div>
                  </div>
                  <Button onClick={createGame} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Programar Partido
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle className="text-gray-900">Partidos Programados</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Filtrar por categoría:</span>
                    <select
                      value={gamesCategoryFilter}
                      onChange={(e) => setGamesCategoryFilter(e.target.value)}
                      className="p-2 rounded bg-white border border-gray-300 text-gray-900"
                    >
                      <option value="">Todas</option>
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
                </CardHeader>
                <CardContent className="p-4">
                  {games
                    .filter((game) => !gamesCategoryFilter || game.category === gamesCategoryFilter)
                    .map((game) => (
                      <div key={game.id} className="flex items-center justify-between mb-4 p-4 bg-white/5 rounded">
                        <div>
                          <h3 className="text-gray-900 font-semibold text-lg">
                            {game.home_team} vs {game.away_team}
                          </h3>
                          <div className="text-gray-600 text-sm">
                            {game.game_date} - {game.game_time}
                          </div>
                          <div className="text-gray-600 text-sm">
                            {game.venue} - {game.field}
                          </div>
                          <div className="text-gray-600 text-sm">
                            Árbitros: {[game.referee1, game.referee2].filter(Boolean).join(", ") || "Sin asignar"}
                          </div>
                          {game.game_type && (
                            <Badge className="mt-1 bg-purple-600 text-white">
                              {game.game_type === "wildbrowl" ? "WildBrowl 1v1" : "Flag Football"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getStatusColor(game.status)} text-white`}>
                            {getStatusLabel(game.status)}
                          </Badge>
                          {game.status === "finalizado" && (
                            <div className="text-gray-900 font-bold text-lg">
                              {game.home_score} - {game.away_score}
                            </div>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setEditingGame(game)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteGame(game.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Edit Game Modal */}
              {editingGame && (
                <Card className="bg-white border border-gray-200 fixed inset-4 z-50 overflow-auto">
                  <CardHeader>
                    <CardTitle className="text-black">
                      Editar Partido: {editingGame.home_team} vs {editingGame.away_team}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-black">Estado</Label>
                        <select
                          value={editingGame.status}
                          onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value })}
                          className="w-full p-2 rounded bg-black/10 border border-black/20 text-black"
                        >
                          <option value="programado">Programado</option>
                          <option value="en vivo">En Vivo</option>
                          <option value="finalizado">Finalizado</option>
                        </select>
                      </div>
                      <div />
                      <div>
                        <Label className="text-black">Árbitro Principal</Label>
                        <Input
                          value={editingGame.referee1 || ""}
                          onChange={(e) => setEditingGame({ ...editingGame, referee1: e.target.value })}
                          className="bg-black/10 border-black/20 text-black placeholder:text-black/50"
                          placeholder="Nombre del árbitro principal"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Árbitro Asistente</Label>
                        <Input
                          value={editingGame.referee2 || ""}
                          onChange={(e) => setEditingGame({ ...editingGame, referee2: e.target.value })}
                          className="bg-black/10 border-black/20 text-black placeholder:text-black/50"
                          placeholder="Nombre del árbitro asistente"
                        />
                      </div>
                      {(editingGame.status === "en vivo" || editingGame.status === "finalizado") && (
                        <>
                          <div>
                            <Label className="text-black">Marcador {editingGame.home_team}</Label>
                            <Input
                              type="number"
                              value={editingGame.home_score ?? 0}
                              onChange={(e) =>
                                setEditingGame({ ...editingGame, home_score: Number.parseInt(e.target.value || "0") })
                              }
                              className="bg-black/10 border-black/20 text-black"
                            />
                          </div>
                          <div>
                            <Label className="text-black">Marcador {editingGame.away_team}</Label>
                            <Input
                              type="number"
                              value={editingGame.away_score ?? 0}
                              onChange={(e) =>
                                setEditingGame({ ...editingGame, away_score: Number.parseInt(e.target.value || "0") })
                              }
                              className="bg-black/10 border-black/20 text-black"
                            />
                          </div>
                        </>
                      )}
                      {editingGame.status === "finalizado" && (
                        <div className="col-span-2">
                          <Label className="text-black">MVP del Partido</Label>
                          <Input
                            value={editingGame.mvp || ""}
                            onChange={(e) => setEditingGame({ ...editingGame, mvp: e.target.value })}
                            className="bg-black/10 border-white/20 text-black placeholder:text-black/50"
                            placeholder="Nombre del MVP (opcional)"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEditingGame(null)}
                        className="text-red border-black/20 hover:bg-black/10"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() =>
                          updateGameStatus(
                            editingGame.id,
                            editingGame.status,
                            editingGame.home_score,
                            editingGame.away_score,
                            editingGame.mvp,
                            editingGame.referee1,
                            editingGame.referee2,
                          )
                        }
                        className="bg-green-600 hover:bg-green-700 text-white"
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
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Registrar Pago General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Equipo</Label>
                      <select
                        value={paymentForm.team_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, team_id: e.target.value })}
                        className="w-full p-2 rounded bg-white border border-gray-300 text-gray-900"
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
                      <Label className="text-gray-700">Monto</Label>
                      <Input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="1600"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-gray-700">Descripción</Label>
                      <Input
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                        placeholder="Inscripción temporada"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Fecha límite</Label>
                      <Input
                        type="date"
                        value={paymentForm.due_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <Button onClick={createPayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
                          {p.payment_type} — ${p.amount.toFixed(2)} MXN
                        </div>
                        <div className="text-white/50 text-xs">Vence: {p.due_date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPaymentStatusColor(p.status)} text-white flex items-center gap-1`}>
                          {getPaymentStatusIcon(p.status)}
                          {p.status}
                        </Badge>
                        {p.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(p.id, "paid")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Marcar Pagado
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Estadisticas */}
          <TabsContent value="stats">
            <PlayerStatsAdmin games={games} teams={teams} players={players} />
          </TabsContent>

          {/* Calendario */}
          <TabsContent value="calendar">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Calendario de Partidos</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Vista de Calendario</h3>
                  <p className="text-gray-600">
                    Aquí se mostrará un calendario interactivo con todos los partidos programados.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaches">
            <div className="grid gap-4">
              {coachPermissions.length === 0 ? (
                <Card className="bg-white border border-gray-200">
                  <CardContent className="p-6 text-gray-700">No hay solicitudes de entrenadores.</CardContent>
                </Card>
              ) : (
                coachPermissions.map((perm) => (
                  <Card key={perm.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="text-white">
                        <div className="font-semibold">
                          {perm.users.username} ({perm.users.email})
                        </div>
                        <div className="text-sm text-white/70">
                          Equipo: {perm.teams.name} — {perm.teams.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={perm.approved_by_admin ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}
                        >
                          {perm.approved_by_admin ? "Aprobado" : "Pendiente"}
                        </Badge>
                        {!perm.approved_by_admin && (
                          <Button
                            size="sm"
                            onClick={() => approveCoach(perm.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
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

          <TabsContent value="wildbrowl">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Administración WildBrowl
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Target className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Panel de WildBrowl</h3>
                  <p className="text-gray-700 mb-6">Administra el torneo 1v1, participantes, brackets y resultados.</p>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <Button
                      onClick={() => (window.location.href = "/wildbrowl/admin")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Administrar WildBrowl
                    </Button>
                    <Button
                      onClick={() => (window.location.href = "/wildbrowl")}
                      variant="outline"
                      className="border-gray-300 text-gray-900 hover:bg-gray-100"
                    >
                      Ver Página Pública
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Configuraciones de la Liga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-gray-900">
                    <div className="font-semibold">Temporada Iniciada</div>
                    <div className="text-gray-700 text-sm">Controla el estado de la temporada</div>
                  </div>
                  <Button onClick={toggleSeasonStatus} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {systemConfig.season_started === "true" ? "Marcar como NO iniciada" : "Marcar como Iniciada"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-gray-900">
                    <div className="font-semibold">WildBrowl 1v1</div>
                    <div className="text-gray-700 text-sm">Habilita o deshabilita el torneo 1v1</div>
                  </div>
                  <Button onClick={toggleWildBrowl} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {systemConfig.wildbrowl_enabled === "true" ? "Deshabilitar" : "Habilitar"}
                  </Button>
                </div>

                {/* Categorias activas para Estadisticas */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 mb-1">Categorias activas en Estadisticas</div>
                  <p className="text-gray-500 text-sm mb-3">Selecciona las categorias que apareceran en la pagina publica de estadisticas y ranking.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { value: "varonil-libre", label: "Varonil Libre" },
                      { value: "varonil-gold", label: "Varonil Gold" },
                      { value: "varonil-silver", label: "Varonil Silver" },
                      { value: "femenil-gold", label: "Femenil Gold" },
                      { value: "femenil-silver", label: "Femenil Silver" },
                      { value: "mixto-gold", label: "Mixto Gold" },
                      { value: "mixto-silver", label: "Mixto Silver" },
                      { value: "mixto-recreativo", label: "Mixto Recreativo" },
                      { value: "femenil-cooper", label: "Femenil Cooper" },
                      { value: "teens", label: "Teens" },
                    ].map((cat) => {
                      const enabledCats: string[] = (() => {
                        try { return JSON.parse(systemConfig.enabled_categories || "[]") } catch { return [] }
                      })()
                      const isActive = enabledCats.includes(cat.value)
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={async () => {
                            let updated: string[]
                            if (isActive) {
                              updated = enabledCats.filter((c) => c !== cat.value)
                            } else {
                              updated = [...enabledCats, cat.value]
                            }
                            await updateConfig("enabled_categories", JSON.stringify(updated))
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            isActive
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {cat.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Fecha límite de inscripción</Label>
                  <div className="flex gap-3 mt-2">
                    <Input
                      type="date"
                      value={systemConfig.registration_deadline || ""}
                      onChange={(e) => setSystemConfig((prev) => ({ ...prev, registration_deadline: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                    <Button
                      onClick={() => updateConfig("registration_deadline", systemConfig.registration_deadline || "")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mvps">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Administración de MVPs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Star className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Panel de MVPs</h3>
                  <p className="text-gray-700 mb-6">Administra los MVPs semanales y de juegos de la liga.</p>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <Button
                      onClick={() => (window.location.href = "/admin/mvps")}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Administrar MVPs
                    </Button>
                    <Button
                      onClick={() => (window.location.href = "/estadisticas")}
                      variant="outline"
                      className="border-gray-300 text-gray-900 hover:bg-gray-100"
                    >
                      Ver Estadísticas MVP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Codes */}
          <TabsContent value="qr">
            <div className="grid gap-6">
              <QRScanner games={games} />
              <PrintableQRSheet teams={teams.map(t => ({ id: Number(t.id), name: t.name, category: t.category, coach_name: t.coach_name, color1: t.color1, color2: t.color2, logo_url: t.logo_url }))} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para crear cuenta de jugador - Admin escribe email y password */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Crear Cuenta para {showAccountForm.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">
                Escribe el correo y contraseña que deseas asignar a este jugador.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="admin-player-email" className="text-gray-700">Correo electronico</Label>
                  <Input
                    id="admin-player-email"
                    type="email"
                    placeholder="jugador@ejemplo.com"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="admin-player-password" className="text-gray-700">Contrasena</Label>
                  <Input
                    id="admin-player-password"
                    type="text"
                    placeholder="Minimo 6 caracteres"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">La contrasena sera visible para que puedas compartirla con el jugador.</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createPlayerAccount(showAccountForm, accountForm.email, accountForm.password)}
                  disabled={creatingAccount === Number(showAccountForm.id) || !accountForm.email || !accountForm.password}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {creatingAccount === Number(showAccountForm.id) ? (
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
                  className="border-gray-300 text-gray-900"
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
                <Key className="w-5 h-5 text-emerald-600" />
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
                        <Check className="w-4 h-4 text-emerald-600" />
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
                        <Check className="w-4 h-4 text-emerald-600" />
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
                  className="border-gray-300 text-gray-900"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}