"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { SeasonSelector } from "@/components/season-selector"
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
  ChevronDown,
  Radio,
  Award,
  Flag,
} from "lucide-react"
import { BrandBlobs, BrandLoader, SectionHeading, brandButtonClass, ghostButtonClass } from "@/components/ui-v2/brand"
import { CountUp, EASE_OUT, HoverLift, Reveal, Stagger, StaggerItem } from "@/components/ui-v2/motion"
import { MatchCard } from "@/components/ui-v2/match-card"

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

const FEATURES = [
  {
    img: "/images/live.png",
    title: "Transmisiones en Vivo",
    text: "Todos los partidos del Campo A se transmiten en vivo para que no te pierdas ni una jugada, estés donde estés. ¡Siente la emoción desde cualquier dispositivo!",
  },
  {
    img: "/images/estadisticas.png",
    title: "Estadísticas en Tiempo Real",
    text: "Consulta resultados, posiciones, rendimiento de jugadores y mucho más, todo actualizado jugada por jugada.",
  },
  {
    img: "/images/media.png",
    title: "Contenido Multimedia",
    text: "Nuestro equipo media captura cada momento clave: fotos, videos, reels y contenido exclusivo para que revivas cada jornada desde otro ángulo.",
  },
  {
    img: "/images/hidratacion.png",
    title: "Puntos de Hidratación",
    text: "En cada jornada encontrarás estaciones de hidratación gratuita para todos los jugadores. Rendimiento, salud y seguridad siempre van primero.",
  },
  {
    img: "/images/serviciosmedicos.png",
    title: "Atención Médica",
    text: "Contamos con paramédicos profesionales durante cada jornada, listos para atender cualquier eventualidad. Porque tu seguridad es prioridad.",
  },
  {
    img: "/images/arbitro.png",
    title: "Seguridad y arbitraje profesional",
    text: "Nos tomamos en serio la seguridad y la imparcialidad. Árbitros expertos, protocolos confiables y un entorno donde lo más importante es disfrutar del juego con respeto y equidad.",
  },
]

const CONVOCATORIA = [
  { Icon: Calendar, title: "Cierre de registro", value: "14 sep", sub: "2026" },
  { Icon: Play, title: "Kickoff", value: "20 sep", sub: "Jornada 1" },
  { Icon: Trophy, title: "Inscripción", value: "$1,900", sub: "Por equipo" },
  { Icon: MapPin, title: "Sede", value: "Deportivo", sub: "Tapias" },
  { Icon: Users, title: "Formato", value: "8 jornadas", sub: "Regular + playoffs" },
  { Icon: Target, title: "Arbitraje", value: "$350", sub: "Por equipo / partido" },
  { Icon: Clock, title: "Junta previa", value: "10 sep", sub: "Capitanes y coaches" },
  { Icon: Star, title: "Premiación", value: "Campeón", sub: "Subcampeón y MVPs" },
]

const CATEGORIES = [
  { name: "Femenil Copper", img: "/images/femenilcopper.png" },
  { name: "Femenil Silver", img: "/images/femenilsilver.png" },
  { name: "Femenil Gold", img: "/images/femenilgold.png" },
  { name: "Mixto Silver", img: "/images/mixtosilver.png" },
  { name: "Mixto Gold", img: "/images/mixtogold.png" },
  { name: "Varonil Silver", img: "/images/varonilsilver.png" },
  { name: "Varonil Gold", img: "/images/varonilgold.png" },
]

const SPONSORS = [
  { src: "/images/Wildsports.png", alt: "Wild Sports" },
  { src: "/images/WildStudio.png", alt: "Wild Studio" },
  { src: "/images/Axis.png", alt: "Axis Flag Football" },
  { src: "/images/doctor-click.png", alt: "Dr. Click" },
  { src: "/images/rnb.png", alt: "RNB" },
  { src: "/images/AguaRoca.png", alt: "Agua Roca" },
]

const ICON_TINTS = ["from-brand-blue to-sky-400", "from-brand-pink to-fuchsia-400", "from-brand-orange to-amber-400"]

function HomePageContent() {
  const searchParams = useSearchParams()
  const selectedSeason = searchParams.get("season")
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [systemConfig, setSystemConfig] = useState<{ [key: string]: string }>({})
  const reduce = useReducedMotion()

  const loadData = async () => {
    try {
      const [gamesResponse, teamsResponse, newsResponse, configResponse] = await Promise.all([
        fetch(selectedSeason ? `/api/games?season=${encodeURIComponent(selectedSeason)}` : "/api/games"),
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
      const deadlineDate = systemConfig.registration_deadline || "2026-09-14"
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
  }, [selectedSeason])

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
      "varonil-cooper": "Varonil Cooper",
      "femenil-gold": "Femenil Gold",
      "femenil-silver": "Femenil Silver",
      "femenil-cooper": "Femenil Cooper A",
      "femenil-cooper-a": "Femenil Cooper A",
      "femenil-cooper-b": "Femenil Cooper B",
      "mixto-gold": "Mixto Gold",
      "mixto-silver": "Mixto Silver",
      "mixto-cooper": "Mixto Cooper",
      "1v1": "1v1",
    }
    return labels[category] || category
  }

  const isSeasonStarted = systemConfig.season_started === "true"
  const isWildBrowlEnabled = systemConfig.wildbrowl_enabled === "true"
  const getTeam = (name: string) => teams.find((t) => t.name === name)

  if (loading) {
    return <BrandLoader label="Cargando Flag Durango…" />
  }

  const heroFade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE_OUT, delay },
  })

  return (
    <div className="ui-v2 min-h-screen bg-white">
      {/* HERO */}
      <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden bg-brand-ink">
        <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src="images/video.mp4" type="video/mp4" />
          Tu navegador no soporta videos.
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-ink/75 via-brand-ink/55 to-brand-ink/95" />
        <BrandBlobs intensity={0.55} className="mix-blend-screen" />
        <div className="absolute inset-0 bg-grid-white opacity-50 mask-fade-b" aria-hidden />

        <div className="container relative z-10 mx-auto px-4 py-24 text-center">
          <motion.div
            {...heroFade(0)}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-orange" />
            </span>
            {isSeasonStarted ? "Temporada Otoño 2026 · En curso" : "Temporada Otoño 2026 · Inscripciones abiertas"}
          </motion.div>

          <motion.h1
            {...heroFade(0.1)}
            className="font-display text-6xl font-black uppercase italic leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl"
          >
            {isSeasonStarted ? "Liga Flag" : "Flag Durango"}
            <span className="mt-2 block text-brand-gradient pb-2">
              {isSeasonStarted ? "Durango" : "Otoño 2026"}
            </span>
          </motion.h1>

          <motion.p {...heroFade(0.2)} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
            {isSeasonStarted ? (
              <>
                Temporada Otoño 2026 — 21 años promoviendo el flag football en Durango.
                <span className="mt-2 block font-semibold text-amber-300">¡La temporada activa está en marcha!</span>
              </>
            ) : (
              "21 años de historia. Por primera vez, parte del sistema federado de la FMFA."
            )}
          </motion.p>

          {!isSeasonStarted && (
            <motion.div {...heroFade(0.3)} className="mt-12">
              <p className="mb-5 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-white/70">
                <Clock className="h-4 w-4" /> Cierre de inscripciones en
              </p>
              <div className="mx-auto grid max-w-xl grid-cols-4 gap-3 md:gap-4">
                {[
                  { v: countdown.days, l: "Días" },
                  { v: countdown.hours, l: "Horas" },
                  { v: countdown.minutes, l: "Min" },
                  { v: countdown.seconds, l: "Seg" },
                ].map((c) => (
                  <div
                    key={c.l}
                    className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-2 py-4 backdrop-blur-md"
                  >
                    <div className="relative h-10 overflow-hidden md:h-12">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                          key={c.v}
                          initial={reduce ? false : { y: "100%", opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: "-100%", opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE_OUT }}
                          className="font-display text-4xl font-extrabold italic tabular-nums text-white md:text-5xl"
                        >
                          {String(c.v).padStart(2, "0")}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">{c.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div {...heroFade(0.4)} className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            {isSeasonStarted ? (
              <>
                <button className={brandButtonClass} onClick={() => (window.location.href = "/partidos")}>
                  <Play className="h-5 w-5" /> Ver Partidos
                </button>
                {isWildBrowlEnabled && (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-orange to-brand-pink px-7 py-3.5 font-bold text-white shadow-brand transition-transform hover:scale-[1.03]"
                    onClick={() => (window.location.href = "/wildbrowl")}
                  >
                    <Target className="h-5 w-5" /> WildBrowl 1v1
                  </button>
                )}
                <button className={ghostButtonClass} onClick={() => (window.location.href = "/estadisticas")}>
                  Ver Estadísticas <ArrowRight className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button className={brandButtonClass} onClick={() => (window.location.href = "/register")}>
                  <UserPlus className="h-5 w-5" /> Registrar Jugador
                </button>
                <button className={ghostButtonClass} onClick={() => (window.location.href = "/register-coach")}>
                  <Trophy className="h-5 w-5" /> Registrar Coach
                </button>
              </>
            )}
          </motion.div>

          {!isSeasonStarted && (
            <motion.p {...heroFade(0.5)} className="mt-8 text-white/80">
              ¿Ya tienes cuenta?
              <a href="/login" className="ml-2 font-semibold text-amber-300 underline-offset-4 hover:underline">
                Inicia sesión aquí
              </a>
            </motion.p>
          )}
        </div>

        <motion.div
          aria-hidden
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60"
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-7 w-7" />
        </motion.div>
        <div className="brand-stripes absolute bottom-0 left-0 h-1.5 w-full" />
      </section>

      {/* 21 AÑOS + FMFA */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-grid opacity-60 mask-fade-b" aria-hidden />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
            <Reveal x={-30} y={0} className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-2xl" aria-hidden />
              <motion.div
                className="relative rounded-[2rem] bg-white p-10 ring-brand"
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src="/images/20.png" alt="21 Años de Flag Durango" className="mx-auto h-auto w-full max-w-xs" />
              </motion.div>
            </Reveal>

            <Reveal x={30} y={0}>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
                <Award className="h-4 w-4" /> Anuncio histórico
              </p>
              <h2 className="font-display text-5xl font-extrabold uppercase italic leading-[0.95] tracking-tight text-slate-900 md:text-6xl">
                Incorporación oficial
                <span className="block text-brand-gradient pb-1">a la FMFA</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Después de más de 20 años de trayectoria, Liga Flag Durango se incorpora por primera vez al sistema de la
                Federación Mexicana de Fútbol Americano. A partir de Otoño 2026, equipos, coaches, jugadores y árbitros
                forman parte del sistema federado con proyección nacional.
              </p>
            </Reveal>
          </div>

          <Stagger className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              { k: "Preselecciones", v: "Procesos nacionales", Icon: Flag },
              { k: "Competencias", v: "Alcance federado", Icon: Trophy },
              { k: "Desarrollo", v: "Identificación de talento", Icon: Star },
            ].map(({ k, v, Icon }, i) => (
              <StaggerItem key={k}>
                <HoverLift className="h-full rounded-3xl bg-white p-7 ring-brand">
                  <span
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${ICON_TINTS[i % 3]} text-white shadow-lg`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{v}</p>
                </HoverLift>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {!isSeasonStarted ? (
        <>
          {/* UNA LIGA HECHA PARA TI */}
          <section className="bg-slate-50 py-24">
            <div className="container mx-auto px-4">
              <SectionHeading title="Una liga hecha para ti" />
              <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <StaggerItem key={f.title} className="h-full">
                    <HoverLift className="group relative h-full overflow-hidden rounded-3xl bg-white p-8 ring-brand">
                      <div
                        className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
                        aria-hidden
                      />
                      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <img src={f.img} alt={f.title} className="h-10 w-10" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900">{f.title}</h3>
                      <p className="leading-relaxed text-slate-600">{f.text}</p>
                    </HoverLift>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* CONVOCATORIA */}
          <section className="relative overflow-hidden bg-brand-ink py-24 text-white">
            <BrandBlobs intensity={0.35} />
            <div className="container relative mx-auto px-4">
              <Reveal className="mx-auto mb-14 max-w-2xl text-center">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-white/60">Convocatoria</p>
                <h2 className="font-display text-5xl font-extrabold uppercase italic tracking-tight text-white md:text-6xl">
                  Temporada <span className="text-brand-gradient">Otoño 2026</span>
                </h2>
                <p className="mt-4 text-lg text-white/70">Fechas, costos y sede oficial · Deportivo Tapias</p>
              </Reveal>
              <Stagger className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
                {CONVOCATORIA.map(({ Icon, title, value, sub }, i) => (
                  <StaggerItem key={title}>
                    <HoverLift className="h-full rounded-3xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-sm transition-colors hover:bg-white/[0.1]">
                      <span
                        className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${ICON_TINTS[i % 3]} text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">{title}</h3>
                      <div className="mt-2 font-display text-4xl font-extrabold italic leading-none text-white">{value}</div>
                      <div className="mt-2 text-sm text-white/60">{sub}</div>
                    </HoverLift>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* CATEGORÍAS */}
          <section className="py-24">
            <div className="container mx-auto px-4">
              <SectionHeading title="Categorías" subtitle="Temporada Otoño 2026 · Todas con 8 jornadas regulares" />
              <Stagger className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" stagger={0.05}>
                {CATEGORIES.map((cat) => (
                  <StaggerItem key={cat.name}>
                    <HoverLift className="group flex h-full flex-col items-center rounded-3xl bg-white p-7 text-center ring-brand">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-50 to-slate-100 transition-transform duration-300 group-hover:scale-110">
                        <img src={cat.img} alt={cat.name} className="h-12 w-12" />
                      </div>
                      <h4 className="font-display text-xl font-bold uppercase italic text-slate-900">{cat.name}</h4>
                    </HoverLift>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* MVPs */}
          <section className="bg-slate-50 py-24">
            <div className="container mx-auto px-4">
              <SectionHeading icon={<Award className="h-6 w-6" />} title="Premiación MVPs" />
              <Stagger className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
                {["MVP Temporada Regular", "MVP de la Final", "Reconocimientos individuales"].map((label) => (
                  <StaggerItem key={label}>
                    <HoverLift className="relative h-full overflow-hidden rounded-3xl bg-white p-8 text-center ring-brand">
                      <div className="brand-stripes absolute inset-x-0 top-0 h-1" aria-hidden />
                      <motion.img
                        src="/images/MVPs.png"
                        alt={label}
                        className="mx-auto mb-5 h-16 w-16"
                        whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <h4 className="text-lg font-bold text-slate-900">{label}</h4>
                    </HoverLift>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        </>
      ) : null}

      {/* PARTIDOS */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-10 flex justify-end">
          <SeasonSelector />
        </div>

        {liveGames.length > 0 && (
          <section className="mb-20">
            <SectionHeading
              icon={<Radio className="h-6 w-6" />}
              title={
                <span className="inline-flex items-center gap-3">
                  En vivo
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                </span>
              }
              subtitle="Partidos que se están jugando ahora mismo"
            />
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {liveGames.map((game) => (
                <StaggerItem key={game.id} className="h-full">
                  <MatchCard
                    game={game}
                    variant="live"
                    categoryLabel={getCategoryLabel(game.category)}
                    getTeam={getTeam}
                    showReferees={false}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        <section className="mb-20">
          <SectionHeading
            icon={<Calendar className="h-6 w-6" />}
            title="Próximos partidos"
            subtitle="No te pierdas los emocionantes encuentros que vienen"
          />
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingGames.map((game) => (
              <StaggerItem key={game.id} className="h-full">
                <MatchCard
                  game={game}
                  variant="upcoming"
                  categoryLabel={getCategoryLabel(game.category)}
                  getTeam={getTeam}
                />
              </StaggerItem>
            ))}
          </Stagger>
          {upcomingGames.length > 0 && (
            <div className="mt-10 text-center">
              <Link
                href="/partidos"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                Ver todos los partidos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </section>

        {recentGames.length > 0 && (
          <section className="mb-20">
            <SectionHeading
              icon={<Trophy className="h-6 w-6" />}
              title="Resultados recientes"
              subtitle="Los últimos partidos finalizados con sus marcadores"
            />
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentGames.map((game) => (
                <StaggerItem key={game.id} className="h-full">
                  <MatchCard
                    game={game}
                    variant="final"
                    categoryLabel={getCategoryLabel(game.category)}
                    getTeam={getTeam}
                    showReferees={false}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>

      {/* LIGA EN NÚMEROS */}
      <section className="relative overflow-hidden bg-brand-gradient-animated py-20 text-white">
        <div className="absolute inset-0 bg-grid-white opacity-40" aria-hidden />
        <div className="container relative mx-auto px-4">
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-5xl font-extrabold uppercase italic tracking-tight text-white md:text-6xl">
              Liga en números
            </h2>
            <p className="mt-3 text-lg text-white/85">Estadísticas generales de la temporada actual</p>
          </Reveal>
          <Stagger className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              { Icon: Trophy, value: teams.length, label: "Equipos Registrados" },
              { Icon: Calendar, value: games.length, label: "Partidos Programados" },
              { Icon: Users, value: recentGames.length, label: "Partidos Finalizados" },
            ].map(({ Icon, value, label }) => (
              <StaggerItem key={label}>
                <div className="rounded-3xl border border-white/25 bg-white/15 p-8 text-center backdrop-blur-md">
                  <Icon className="mx-auto mb-4 h-10 w-10 text-white" />
                  <CountUp
                    value={value}
                    className="block font-display text-6xl font-black italic leading-none text-white"
                  />
                  <p className="mt-3 font-semibold text-white/85">{label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* SPONSORS */}
      <section className="overflow-hidden bg-white py-16">
        <Reveal className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Nuestros sponsors</p>
        </Reveal>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
          <div className="flex w-max animate-marquee items-center gap-16 hover:[animation-play-state:paused]">
            {[...SPONSORS, ...SPONSORS].map((s, i) => (
              <img
                key={`${s.alt}-${i}`}
                src={s.src}
                alt={s.alt}
                className="h-14 w-auto opacity-70 grayscale transition-all duration-300 hover:scale-110 hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<BrandLoader label="Cargando temporada…" />}>
      <HomePageContent />
    </Suspense>
  )
}
