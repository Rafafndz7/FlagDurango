"use client"

import { useEffect, useState, useRef, type CSSProperties, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Users,
  Trophy,
  Star,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  Upload,
  Loader2,
  Medal,
  ArrowLeft,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandBlobs, BrandLoader, SectionHeading, brandButtonClass } from "@/components/ui-v2/brand"
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/ui-v2/motion"
import { MatchCard } from "@/components/ui-v2/match-card"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"

interface Team {
  id: number
  name: string
  category: string
  color1: string
  color2: string
  logo_url?: string
  captain_name?: string
  captain_phone?: string
  captain_photo_url?: string
  coach_id?: number
  coach_name?: string
  coach_phone?: string
  coach_photo_url?: string
  is_institutional: boolean
  coordinator_name?: string
  coordinator_phone?: string
  paid?: boolean
}

interface AttendanceRecord {
  player_id: number
  attended: boolean
}

interface Championship {
  id: number
  title: string
  year: number
  tournament?: string
  position?: string
  description?: string
}

interface Player {
  id: number
  name: string
  jersey_number: number
  position: string
  photo_url?: string
  team_id: number
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
  status: string
  mvp?: string
  category: string
}

export default function TeamPage() {
  const params = useParams()
  const teamId = params.id as string
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendanceMap, setAttendanceMap] = useState<Record<number, { attended: number; total: number }>>({})
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null)
  const [championships, setChampionships] = useState<Championship[]>([])
  const [uploadingCoachPhoto, setUploadingCoachPhoto] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const coachPhotoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const u = JSON.parse(userData)
        setLoggedUserId(u.id || null)
      }
    } catch {}
  }, [])

  const isCoach = team?.coach_id != null && loggedUserId != null && team.coach_id === loggedUserId

  const handleUploadFile = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()
    return data.success ? data.url : null
  }

  const handleCoachPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !team) return
    setUploadingCoachPhoto(true)
    try {
      const url = await handleUploadFile(file, "coach-photos")
      if (url) {
        await fetch("/api/teams", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: team.id, coach_photo_url: url }),
        })
        setTeam((prev) => prev ? { ...prev, coach_photo_url: url } : prev)
      }
    } catch {}
    setUploadingCoachPhoto(false)
    if (coachPhotoRef.current) coachPhotoRef.current.value = ""
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !team) return
    setUploadingLogo(true)
    try {
      const url = await handleUploadFile(file, "team-logos")
      if (url) {
        await fetch("/api/teams", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: team.id, logo_url: url }),
        })
        setTeam((prev) => prev ? { ...prev, logo_url: url } : prev)
      }
    } catch {}
    setUploadingLogo(false)
    if (logoRef.current) logoRef.current.value = ""
  }

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Cargar datos del equipo
        const teamResponse = await fetch(`/api/teams?id=${teamId}`)
        const teamData = await teamResponse.json()

        if (!teamData.success) {
          setError(teamData.message || "Error al cargar el equipo")
          return
        }

        const teamInfo = teamData.data
        setTeam(teamInfo)
        setPlayers(teamData.players || [])

        // Cargar campeonatos del equipo
        try {
          const champRes = await fetch(`/api/championships?team_id=${teamId}`)
          const champData = await champRes.json()
          if (champData.success) setChampionships(champData.data || [])
        } catch {}

        // Cargar SOLO los partidos de este equipo específico
        if (teamInfo?.name) {
          const gamesResponse = await fetch(`/api/games`)
          const gamesData = await gamesResponse.json()

          if (gamesData.success) {
            const teamGames = (gamesData.data || []).filter(
              (game: Game) => game.home_team === teamInfo.name || game.away_team === teamInfo.name,
            )
            setGames(teamGames)

            // Fetch attendance for all completed games
            const completedGames = teamGames.filter((g: Game) => g.status === "finalizado")
            const playersList = teamData.players || []
            if (completedGames.length > 0 && playersList.length > 0) {
              const attendanceResults: Record<number, { attended: number; total: number }> = {}
              playersList.forEach((p: Player) => {
                attendanceResults[p.id] = { attended: 0, total: completedGames.length }
              })

              const attendancePromises = completedGames.map((game: Game) =>
                fetch(`/api/attendance?game_id=${game.id}`).then((r) => r.json()),
              )
              const attendanceData = await Promise.all(attendancePromises)

              attendanceData.forEach((res) => {
                if (res.success && res.data) {
                  res.data.forEach((record: AttendanceRecord) => {
                    if (attendanceResults[record.player_id] && record.attended) {
                      attendanceResults[record.player_id].attended += 1
                    }
                  })
                }
              })

              setAttendanceMap(attendanceResults)
            }
          }
        }
      } catch (err) {
        console.error("Error loading team data:", err)
        setError("Error al cargar los datos del equipo")
      } finally {
        setLoading(false)
      }
    }

    if (teamId) {
      loadTeamData()
    }
  }, [teamId])

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      "varonil-gold": "Varonil Gold",
      "varonil-silver": "Varonil Silver",
      "femenil-gold": "Femenil Gold",
      "femenil-silver": "Femenil Silver",
      "femenil-cooper": "Femenil Cooper A",
      "femenil-cooper-a": "Femenil Cooper A",
      "femenil-cooper-b": "Femenil Cooper B",
      "mixto-gold": "Mixto Gold",
      "mixto-silver": "Mixto Silver",
    }
    return labels[category] || category
  }

  const upcomingGames = games
    .filter((game) => game.status === "programado")
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 5)

  const recentGames = games
    .filter((game) => game.status === "finalizado")
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 5)

  const liveGames = games.filter((game) => game.status === "en_vivo" || game.status === "en vivo")


  if (loading) {
    return <BrandLoader label="Cargando equipo…" />
  }

  if (error || !team) {
    return (
      <div className="ui-v2 flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
          <h1 className="mb-3 font-display text-4xl font-extrabold uppercase italic text-slate-900">Error</h1>
          <p className="text-slate-600">{error || "Equipo no encontrado"}</p>
          <button onClick={() => (window.location.href = "/equipos")} className={`${brandButtonClass} mt-6`}>
            Volver a Equipos
          </button>
        </div>
      </div>
    )
  }

  const c1 = team.color1 || "#0857b5"
  const c2 = team.color2 || "#e266be"
  const getTeam = (name: string) => (name === team.name ? team : undefined)

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <section className="relative isolate overflow-hidden bg-brand-ink py-16 text-white md:py-24">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(60% 80% at 15% 20%, ${c1}aa, transparent 70%), radial-gradient(50% 70% at 85% 30%, ${c2}aa, transparent 70%)`,
          }}
        />
        <BrandBlobs intensity={0.35} />
        <div className="absolute inset-0 bg-grid-white mask-fade-b" aria-hidden />

        <div className="container relative mx-auto px-4">
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => (window.location.href = "/equipos")}
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a Equipos
          </motion.button>

          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-end md:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative"
            >
              <div className="absolute -inset-3 rounded-full bg-brand-gradient opacity-50 blur-xl" aria-hidden />
              <TeamAvatar
                name={team.name}
                logoUrl={team.logo_url}
                color1={team.color1}
                color2={team.color2}
                size="xl"
                className="relative h-32 w-32 text-5xl ring-4 md:h-40 md:w-40"
              />
              {isCoach && (
                <>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-2 ring-white/50 transition-colors hover:bg-slate-100"
                  >
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </button>
                </>
              )}
            </motion.div>

            <div className="flex-1">
              <Reveal>
                <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
                    {getCategoryLabel(team.category)}
                  </span>
                  {team.is_institutional && (
                    <span className="rounded-full bg-violet-500/80 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      Institucional
                    </span>
                  )}
                  {team.paid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle className="h-3.5 w-3.5" /> Inscripción Pagada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      <XCircle className="h-3.5 w-3.5" /> Pendiente de Pago
                    </span>
                  )}
                </div>
                <h1 className="font-display text-5xl font-black uppercase italic leading-[0.9] tracking-tight text-white md:text-7xl">
                  {team.name}
                </h1>
              </Reveal>

              <Stagger className="mt-8 grid grid-cols-3 gap-3 md:max-w-lg">
                {[
                  { v: games.length, l: "Partidos" },
                  { v: players.length, l: "Jugadores" },
                  { v: championships.length, l: "Títulos" },
                ].map((s) => (
                  <StaggerItem key={s.l}>
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-md">
                      <CountUp value={s.v} className="block font-display text-4xl font-extrabold italic leading-none" />
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.l}</div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
        <div className="brand-stripes absolute bottom-0 left-0 h-1.5 w-full" />
      </section>

      <div className="container mx-auto px-4 py-12">
        {liveGames.length > 0 && (
          <section className="mb-12">
            <SectionHeading align="left" icon={<Radio className="h-6 w-6" />} title="En vivo" />
            <div className="grid gap-6 md:grid-cols-2">
              {liveGames.map((game) => (
                <MatchCard
                  key={game.id}
                  game={game}
                  variant="live"
                  categoryLabel={getCategoryLabel(game.category)}
                  getTeam={getTeam}
                  showReferees={false}
                />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8">
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Users className="h-5 w-5 text-brand-blue" />
                Información del Equipo
              </h2>
              <div className="space-y-3">
                {(team.coach_name || team.coach_photo_url || isCoach) && (
                  <div className="flex items-center gap-3 rounded-2xl bg-blue-50/70 p-3 ring-1 ring-blue-100">
                    <PersonPhoto
                      src={team.coach_photo_url}
                      alt={`Coach ${team.coach_name || "del equipo"}`}
                      fallback={<User className="h-6 w-6 text-blue-400" />}
                      className="bg-blue-100 ring-blue-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">Coach</p>
                      <p className="font-semibold text-slate-900">{team.coach_name || "Coach"}</p>
                      {team.coach_phone && (
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3.5 w-3.5" /> {team.coach_phone}
                        </p>
                      )}
                      {isCoach && (
                        <>
                          <input
                            ref={coachPhotoRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleCoachPhotoChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => coachPhotoRef.current?.click()}
                            disabled={uploadingCoachPhoto}
                            className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-brand-blue ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
                          >
                            {uploadingCoachPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            {team.coach_photo_url ? "Cambiar foto" : "Subir mi foto"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {(team.captain_name || team.captain_photo_url) && (
                  <div className="flex items-center gap-3 rounded-2xl bg-amber-50/70 p-3 ring-1 ring-amber-100">
                    <PersonPhoto
                      src={team.captain_photo_url}
                      alt={`Capitan ${team.captain_name || "del equipo"}`}
                      fallback={<Star className="h-6 w-6 text-amber-500" />}
                      className="bg-amber-100 ring-amber-400"
                    />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Capitan</p>
                      <p className="font-semibold text-slate-900">{team.captain_name || "Capitan"}</p>
                      {team.captain_phone && (
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3.5 w-3.5" /> {team.captain_phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {team.is_institutional && team.coordinator_name && (
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 ring-2 ring-slate-300">
                      <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Coordinador</p>
                      <p className="font-semibold text-slate-900">{team.coordinator_name}</p>
                      {team.coordinator_phone && (
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3.5 w-3.5" /> {team.coordinator_phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>

            {championships.length > 0 && (
              <Reveal className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Trophy className="h-5 w-5" />
                    Historial de Campeonatos ({championships.length})
                  </h2>
                </div>
                <Stagger className="space-y-3 p-6">
                  {championships.map((ch) => (
                    <StaggerItem key={ch.id}>
                      <div className="flex items-start gap-3 rounded-2xl bg-amber-50/60 p-3 ring-1 ring-amber-100">
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow"
                        >
                          <Medal className="h-5 w-5" />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900">{ch.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {ch.position && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300">
                                {ch.position}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-sm text-slate-500">
                              <Calendar className="h-3 w-3" /> {ch.year}
                            </span>
                          </div>
                          {ch.tournament && <p className="mt-1 text-sm text-slate-600">{ch.tournament}</p>}
                          {ch.description && <p className="mt-1 text-sm text-slate-400">{ch.description}</p>}
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Reveal>
            )}
          </div>

          <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 lg:col-span-2">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Users className="h-5 w-5 text-brand-pink" />
              Roster ({players.length} jugadores)
            </h2>
            {players.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Users className="h-10 w-10" />
                </div>
                <p className="text-slate-600">No hay jugadores registrados</p>
              </div>
            ) : (
              <Stagger className="grid max-h-[640px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2" stagger={0.03}>
                {players.map((player) => {
                  const att = attendanceMap[player.id]
                  const pct = att && att.total > 0 ? Math.round((att.attended / att.total) * 100) : null
                  return (
                    <StaggerItem key={player.id}>
                      <div className="group flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-md">
                        <div className="relative">
                          <PersonPhoto
                            src={player.photo_url}
                            alt={`Foto de ${player.name}`}
                            className="h-12 w-12 ring-white"
                            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                            fallback={<span className="text-sm font-bold text-white">#{player.jersey_number}</span>}
                          />
                          <span
                            className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-1 font-display text-xs font-extrabold italic text-white ring-2 ring-white"
                          >
                            {player.jersey_number}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-slate-900">{player.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>#{player.jersey_number}</span>
                            {player.position && (
                              <>
                                <span>{"•"}</span>
                                <span>{player.position}</span>
                              </>
                            )}
                          </div>
                          {pct != null && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <motion.div
                                  className="h-full rounded-full bg-emerald-500"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${pct}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                              </div>
                              <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-700">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                {att!.attended}/{att!.total}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            )}
            {players.some((p) => attendanceMap[p.id]?.total > 0) && (
              <p className="mt-3 text-right text-xs text-slate-400">Asistencia: partidos asistidos / partidos jugados</p>
            )}
          </Reveal>
        </div>

        {upcomingGames.length > 0 && (
          <section className="mt-14">
            <SectionHeading align="left" icon={<Calendar className="h-6 w-6" />} title="Próximos partidos" />
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingGames.map((game) => (
                <StaggerItem key={game.id} className="h-full">
                  <MatchCard game={game} variant="upcoming" getTeam={getTeam} showReferees={false} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {recentGames.length > 0 && (
          <section className="mt-14">
            <SectionHeading align="left" icon={<Trophy className="h-6 w-6" />} title="Resultados recientes" />
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentGames.map((game) => (
                <StaggerItem key={game.id} className="h-full">
                  <MatchCard game={game} variant="final" getTeam={getTeam} showReferees={false} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  )
}

function PersonPhoto({
  src,
  alt,
  fallback,
  className,
  style,
}: {
  src?: string
  alt: string
  fallback: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const [broken, setBroken] = useState(false)
  return (
    <div
      className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2", className)}
      style={src && !broken ? undefined : style}
    >
      {src && !broken ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        fallback
      )}
    </div>
  )
}

