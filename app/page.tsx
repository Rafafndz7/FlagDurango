"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  MapPin,
  Clock,
  Trophy,
  Users,
  Star,
  Play,
  ArrowRight,
  Target,
  UserPlus,
  Facebook,
  Instagram,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react"

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

interface Team {
  id: number
  name: string
  category: string
  logo_url?: string
  color1: string
  color2: string
}

interface News {
  id: number
  title: string
  content: string
  image_url?: string
  author: string
  created_at: string
}

interface SystemConfig {
  config_key: string
  config_value: string
}

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [systemConfig, setSystemConfig] = useState<{ [key: string]: string }>({})

  const loadData = async () => {
    try {
      const [gamesResponse, teamsResponse, newsResponse, configResponse] = await Promise.all([
        fetch("/api/games"),
        fetch("/api/teams"),
        fetch("/api/news"),
        fetch("/api/system-config"),
      ])
      const [gamesData, teamsData, newsData, configData] = await Promise.all([
        gamesResponse.json(),
        teamsResponse.json(),
        newsResponse.json(),
        configResponse.json(),
      ])
      if (gamesData.success) {
        setGames(gamesData.data)
      }
      if (teamsData.success) {
        setTeams(teamsData.data)
      }
      if (newsData.success) {
        setNews((newsData.data || []).slice(0, 3))
      }
      if (configData.success) {
        const configMap: { [key: string]: string } = {}
        configData.data.forEach((config: SystemConfig) => {
          configMap[config.config_key] = config.config_value
        })
        setSystemConfig(configMap)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const deadlineDate = systemConfig.registration_deadline || "2025-09-16"
      const targetDate = new Date(`${deadlineDate}T23:59:59`).getTime()
      const now = new Date().getTime()
      const distance = targetDate - now
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setCountdown({ days, hours, minutes, seconds })
      }
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [systemConfig.registration_deadline])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const upcomingGames = games
    .filter((game) => game.status === "programado")
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 6)

  const liveGames = games.filter((game) => game.status === "en_vivo")

  const recentGames = games
    .filter((game) => game.status === "finalizado")
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 6)

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      "varonil-gold": "Varonil Gold",
      "varonil-silver": "Varonil Silver",
      "femenil-gold": "Femenil Gold",
      "femenil-silver": "Femenil Silver",
      "femenil-cooper": "Femenil Cooper",
      "mixto-gold": "Mixto Gold",
      "mixto-silver": "Mixto Silver",
      "1v1": "1v1",
    }
    return labels[category] || category
  }

  const isSeasonStarted = systemConfig.season_started === "true"
  const isWildBrowlEnabled = systemConfig.wildbrowl_enabled === "true"

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section (NAV removida para evitar doble barra) */}
      {!isSeasonStarted ? (
        <>
          {/* Pre-temporada */}
          <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Video de fondo */}
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src="images/video.mp4" type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
            {/* Overlay oscuro para legibilidad */}
            <div className="absolute inset-0 bg-black/50" />

            <div className="container mx-auto px-4 relative z-10 text-center">
              <div className="inline-block bg-yellow-400/95 backdrop-blur-sm text-gray-900 px-8 py-3 rounded-full font-bold mb-8 border border-black/10 shadow-lg">
                {"🏆 Torneo Super Tazón - Express 2026 - ¡Inscripciones Abiertas!"}
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                <span className="block">Torneo Super Tazón</span>
                <span className="block text-white">Express 2026</span>
              </h1>

              {/* Countdown */}
              <div className="mb-12">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center justify-center">
                  <Clock className="w-6 h-6 mr-2" /> Cierre de inscripciones en:
                </h3>
                <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
                  <div className="bg-white/95 backdrop-blur-sm border border-black/10 rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-2xl md:text-3xl font-black text-gray-900">{countdown.days}</div>
                    <div className="text-sm text-gray-600 capitalize">Días</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm border border-black/10 rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-2xl md:text-3xl font-black text-gray-900">{countdown.hours}</div>
                    <div className="text-sm text-gray-600 capitalize">Horas</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm border border-black/10 rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-2xl md:text-3xl font-black text-gray-900">{countdown.minutes}</div>
                    <div className="text-sm text-gray-600 capitalize">Min</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-sm border border-black/10 rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-2xl md:text-3xl font-black text-gray-900">{countdown.seconds}</div>
                    <div className="text-sm text-gray-600 capitalize">Seg</div>
                  </div>
                </div>
              </div>

              {/* Botones de Registro */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg px-8 py-4"
                  onClick={() => (window.location.href = "/register")}
                >
                  <UserPlus className="w-6 h-6 mr-2" /> Registrar Jugador
                </Button>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-lg px-8 py-4"
                  onClick={() => (window.location.href = "/register-coach")}
                >
                  <Trophy className="w-6 h-6 mr-2" /> Registrar Coach
                </Button>
              </div>

              <p className="text-white/90 text-lg mb-4">
                ¿Ya tienes cuenta?
                <a href="/login" className="text-yellow-300 hover:text-yellow-200 font-semibold ml-2 underline">
                  Inicia sesión aquí
                </a>
              </p>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Temporada iniciada */}
          <section className="relative py-20 overflow-hidden min-h-screen flex items-center">
            {/* Video de fondo */}
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src="images/video.mp4" type="video/mp4" />
            </video>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-block bg-green-400/95 backdrop-blur-sm text-gray-900 px-6 py-2 rounded-full font-bold mb-6">
                  {"🏈 Temporada en Curso - ¡Sigue la Acción!"}
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                  Liga Flag
                  <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Durango
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                  20 años haciendo historia en el flag football de Durango.
                  <span className="block mt-2 text-yellow-300 font-semibold">¡La temporada 2026 está en marcha!</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold"
                    onClick={() => (window.location.href = "/partidos")}
                  >
                    <Play className="w-5 h-5 mr-2" /> Ver Partidos
                  </Button>
                  {isWildBrowlEnabled && (
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold"
                      onClick={() => (window.location.href = "/wildbrowl")}
                    >
                      <Target className="w-5 h-5 mr-2" /> WildBrowl 1v1
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-gray-900 bg-transparent"
                    onClick={() => (window.location.href = "/estadisticas")}
                  >
                    Ver Estadísticas <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 20 Años Section */}
      <section className="py-16" style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}>
        <div className="container mx-auto px-4 text-center">
          <img
            src="/images/20.png"
            alt="20 Años de Flag - Haciendo Historia"
            className="max-w-md w-full h-auto mx-auto filter drop-shadow-lg"
          />
        </div>
      </section>

      {/* Secciones solo si no inicia la temporada */}
      {!isSeasonStarted ? (
        <>
          {/* Una Liga Hecha Para Ti */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl md:text-5xl font-black text-center text-gray-900 mb-16">
                UNA LIGA HECHA PARA TI
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img src="/images/live.png" alt="Transmisiones en Vivo" className="w-16 h-16 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Transmisiones en Vivo</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      Todos los partidos del Campo A se transmiten en vivo para que no te pierdas ni una jugada, estés
                      donde estés. ¡Siente la emoción desde cualquier dispositivo!
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img
                      src="/images/estadisticas.png"
                      alt="Estadísticas en Tiempo Real"
                      className="w-16 h-16 mx-auto mb-6"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Estadísticas en Tiempo Real</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      Consulta resultados, posiciones, rendimiento de jugadores y mucho más, todo actualizado jugada por
                      jugada.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img src="/images/media.png" alt="Contenido Multimedia" className="w-16 h-16 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Contenido Multimedia</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      Nuestro equipo media captura cada momento clave: fotos, videos, reels y contenido exclusivo para
                      que revivas cada jornada desde otro ángulo.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img src="/images/hidratacion.png" alt="Puntos de Hidratación" className="w-16 h-16 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Puntos de Hidratación</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      En cada jornada encontrarás estaciones de hidratación gratuita para todos los jugadores.
                      Rendimiento, salud y seguridad siempre van primero.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img src="/images/serviciosmedicos.png" alt="Atención Médica" className="w-16 h-16 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Atención Médica</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      Contamos con paramédicos profesionales durante cada jornada, listos para atender cualquier
                      eventualidad. Porque tu seguridad es prioridad.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col">
                    <img
                      src="/images/arbitro.png"
                      alt="Seguridad y arbitraje profesional"
                      className="w-16 h-16 mx-auto mb-6"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Seguridad y arbitraje profesional</h3>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      Nos tomamos en serio la seguridad y la imparcialidad. Árbitros expertos, protocolos confiables y
                      un entorno donde lo más importante es disfrutar del juego con respeto y equidad.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Convocatoria Primavera 2026 */}
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl md:text-5xl font-black text-center text-gray-900 mb-4">
                Convocatoria Torneo Super Tazón - Express 2026
              </h2>
              <p className="text-xl text-center text-gray-600 mb-16">Todo lo que necesitas saber para participar</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/cierre.png" alt="Cierre de Inscripción" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Cierre de Inscripción</h3>
                    <div className="text-3xl font-black text-gray-900">17 Feb</div>
                    <div className="text-gray-600">2026</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/inscripciones.png" alt="Inscripción" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Inscripción</h3>
                    <div className="text-3xl font-black text-gray-900">$600</div>
                    <div className="text-gray-600">Por equipo</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/fianza.png" alt="Fianza" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Fianza</h3>
                    <div className="text-3xl font-black text-gray-900">$300</div>
                    <div className="text-gray-600">Por equipo</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/inicio.png" alt="Inicio de Temporada" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Inicio de Torneo</h3>
                    <div className="text-3xl font-black text-gray-900">28 de Feb y 1 de Mar</div>
                    <div className="text-gray-600">2026</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/sede.png" alt="Sede" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Sede</h3>
                    <div className="text-xl font-black text-gray-900">Polideportivo</div>
                    <div className="text-gray-600">Mario Vazquez Raña</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/modalidad.png" alt="Modalidad" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Modalidad</h3>
                    <div className="text-xl font-black text-gray-900">IFAF</div>
                    <div className="text-gray-600">Dominical round robin 8 jornadas</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/arbitraje.png" alt="Arbitraje" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Arbitraje</h3>
                    <div className="text-3xl font-black text-gray-900">$180</div>
                    <div className="text-gray-600">Por juego</div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/premiacion.png" alt="Premiación" className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Premiación</h3>
                    <div className="text-xl font-black text-gray-900">Campeón</div>
                    <div className="text-gray-600">Subcampeones y MVPs</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Categorías */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <h3 className="text-3xl md:text-4xl font-black text-center text-gray-900 mb-12">
                Categorías Disponibles
              </h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/varonilgold.png" alt="Varonil Gold" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Varonil Gold</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/varonilsilver.png" alt="Varonil Silver" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Varonil Silver</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/femenilgold.png" alt="Femenil Gold" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Femenil Gold</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/femenilsilver.png" alt="Femenil Silver" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Femenil Silver</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/mixtogold.png" alt="Mixto Gold" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Mixto Gold</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <img src="/images/mixtosilver.png" alt="Mixto Silver" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Mixto Silver</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative">
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">
                    {"¡NUEVA!"}
                  </div>
                  <CardContent className="p-6 text-center">
                    <img src="/images/femenilcopper.png" alt="Cooper Femenil" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">Cooper Femenil</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative">
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">
                    {"¡NUEVO!"}
                  </div>
                  <CardContent className="p-6 text-center">
                    <img src="/images/1vs1.png" alt="1v1" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">1 vs 1</h4>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* MVPs */}
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
              <h3 className="text-3xl md:text-4xl font-black text-center text-gray-900 mb-12">Premiación MVPs</h3>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <img src="/images/MVPs.png" alt="MVP Ofensivo" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">MVP Ofensivo</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <img src="/images/MVPs.png" alt="MVP Defensivo" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">MVP Defensivo</h4>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <img src="/images/MVPs.png" alt="MVP Final" className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900">MVP Final</h4>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <div className="container mx-auto px-4 py-8">
        {/* EN VIVO */}
        {liveGames.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                EN VIVO
              </h2>
              <p className="text-gray-600 text-lg">Partidos que se están jugando ahora mismo</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveGames.map((game) => (
                <Card
                  key={game.id}
                  className="bg-red-50 border-red-200 hover:bg-red-100 transition-all transform hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Badge className="mb-4 bg-red-500 text-white animate-pulse"> EN VIVO</Badge>
                      <h3 className="text-gray-900 font-bold text-xl mb-4">
                        {game.home_team} vs {game.away_team}
                      </h3>
                      <div className="text-4xl font-bold text-gray-900 mb-4">
                        {game.home_score || 0} - {game.away_score || 0}
                      </div>
                      <div className="space-y-2 text-gray-600 text-sm">
                        <div className="flex items-center justify-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {game.venue} - {game.field}
                        </div>
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {game.game_time}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Próximos */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Calendar className="w-10 h-10 mr-3 text-blue-600" />
              Próximos Partidos
            </h2>
            <p className="text-gray-600 text-lg">No te pierdas los emocionantes encuentros que vienen</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingGames.map((game) => (
              <Card
                key={game.id}
                className="bg-white border-gray-200 hover:shadow-lg transition-all transform hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <Badge className="mb-4 bg-blue-600">{getCategoryLabel(game.category)}</Badge>
                    <h3 className="text-gray-900 font-bold text-xl mb-4">
                      {game.home_team} vs {game.away_team}
                    </h3>
                    <div className="space-y-3 text-gray-600 text-sm">
                      <div className="flex items-center justify-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(game.game_date).toLocaleDateString("es-ES", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {game.game_time}
                      </div>
                      <div className="flex items-center justify-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {game.venue} - {game.field}
                      </div>
                      {(game.referee1 || game.referee2) && (
                        <div className="text-xs">
                          Árbitros: {[game.referee1, game.referee2].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Resultados */}
        {recentGames.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <Trophy className="w-10 h-10 mr-3 text-green-600" />
                Resultados Recientes
              </h2>
              <p className="text-gray-600 text-lg">Los últimos partidos finalizados con sus marcadores</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentGames.map((game) => (
                <Card
                  key={game.id}
                  className="bg-white border-gray-200 hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Badge className="mb-4 bg-green-600">{getCategoryLabel(game.category)}</Badge>
                      <h3 className="text-gray-900 font-bold text-xl mb-2">
                        {game.home_team} vs {game.away_team}
                      </h3>
                      <div className="text-4xl font-bold text-gray-900 mb-4">
                        {game.home_score} - {game.away_score}
                      </div>
                      <div className="space-y-2 text-gray-600 text-sm">
                        <div className="flex items-center justify-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(game.game_date).toLocaleDateString("es-ES")}
                        </div>
                        <div className="flex items-center justify-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {game.venue} - {game.field}
                        </div>
                        {game.mvp && (
                          <div className="flex items-center justify-center text-yellow-600">
                            <Star className="w-4 h-4 mr-1" />
                            MVP: {game.mvp}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Liga en números */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Liga en Números</h2>
            <p className="text-gray-600 text-lg">Estadísticas generales de la temporada actual</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-gray-900">{teams.length}</h3>
                <p className="text-gray-600">Equipos Registrados</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-gray-900">{games.length}</h3>
                <p className="text-gray-600">Partidos Programados</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-gray-900">{recentGames.length}</h3>
                <p className="text-gray-600">Partidos Finalizados</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      {/* Sponsors */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-600 mb-12 tracking-wider">NUESTROS SPONSORS</h2>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <img
              src="/images/Wildsports.png"
              alt="Wild Sports"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
            <img
              src="/images/WildStudio.png"
              alt="Wild Studio"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
            <img
              src="/images/Axis.png"
              alt="Axis Flag Football"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
            <img
              src="/images/doctor-click.png"
              alt="Dr. Click"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
            <img
              src="/images/rnb.png"
              alt="RNB"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
            <img
              src="/images/AguaRoca.png"
              alt="Agua Roca"
              className="h-14 w-auto filter grayscale-20 hover:grayscale-0 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Logo */}
            <div className="flex flex-col items-start">
              <img src="/images/20.png" alt="20 Años de Flag" className="w-40 h-auto mb-4" />
              <p className="text-sm text-gray-400">20 años haciendo historia en el Flag Football.</p>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">CONTACTO</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> (618) 328 8280
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> flagdurango@gmail.com
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> C. Guadalupe 749, Zona Centro, 34000. Durango, Dgo
                </li>
              </ul>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">LINKS</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://wild-studio.mx/" target="_blank" className="hover:text-white" rel="noreferrer">
                    • WildStudio
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/profile.php?id=61576406477003"
                    target="_blank"
                    className="hover:text-white"
                    rel="noreferrer"
                  >
                    • WildSports
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/axisflagfootball"
                    target="_blank"
                    className="hover:text-white"
                    rel="noreferrer"
                  >
                    • Axis Flag Football
                  </a>
                </li>
              </ul>
            </div>

            {/* Redes */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">SÍGUENOS</h3>
              <div className="flex gap-3">
                <a
                  href="https://wa.me/526183288280"
                  target="_blank"
                  className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors"
                  rel="noreferrer"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/share/1AfHDmwRku/?mibextid=wwXIfr"
                  target="_blank"
                  className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  rel="noreferrer"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/flag.durango?igsh=aW5jNzVlZTU1YXFy"
                  target="_blank"
                  className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-pink-500 transition-colors"
                  rel="noreferrer"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-10">
            <div
              className="text-white text-center py-4 rounded-lg text-sm"
              style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
            >
              <p className="font-semibold">FLAGDURANGO.COM.MX / CREADO POR RafaFndz</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
