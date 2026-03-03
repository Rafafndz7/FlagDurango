"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Users, Trophy, Star, Phone, MapPin, Calendar, Clock, CheckCircle, XCircle, User, Upload, Loader2, Medal } from "lucide-react"

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
      "femenil-cooper": "Femenil Cooper",
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
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600">{error || "Equipo no encontrado"}</p>
              <Button onClick={() => (window.location.href = "/equipos")} className="mt-4">
                Volver a Equipos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section
        className="relative py-20 overflow-hidden"
        style={{ background: "linear-gradient(to right, #0857b5, #e266be, #ff6d06)" }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Button
              onClick={() => (window.location.href = "/equipos")}
              className="mb-6 bg-white/20 hover:bg-white/30 text-white border-white/20"
              variant="outline"
            >
              ← Volver a Equipos
            </Button>

            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`Logo de ${team.name}`}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const fallback = target.parentElement?.querySelector('[data-fallback]') as HTMLElement
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                ) : null}
                <div
                  data-fallback
                  className="w-full h-full items-center justify-center text-white font-bold text-4xl"
                  style={{
                    display: team.logo_url ? "none" : "flex",
                    background: `linear-gradient(135deg, ${team.color1}, ${team.color2})`,
                  }}
                >
                  {team.name ? team.name.charAt(0) : "?"}
                </div>
              </div>
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
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors border-2 border-white/50"
                  >
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{team.name}</h1>

            <div className="flex flex-wrap gap-4 justify-center mb-6">
              <Badge className="bg-blue-600 text-white text-lg px-4 py-2">{getCategoryLabel(team.category)}</Badge>
              {team.is_institutional && (
                <Badge className="bg-purple-600 text-white text-lg px-4 py-2">Institucional</Badge>
              )}
              {team.paid ? (
                <Badge className="bg-green-600 text-white text-lg px-4 py-2">Inscripción Pagada</Badge>
              ) : (
                <Badge className="bg-red-600 text-white text-lg px-4 py-2">Pendiente de Pago</Badge>
              )}
            </div>

            <p className="text-xl text-white/90 mb-8">
              {games.length} partidos programados • {players.length} jugadores registrados
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* EN VIVO */}
        {liveGames.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
              EN VIVO
            </h2>
            <div className="grid gap-4">
              {liveGames.map((game) => (
                <Card key={game.id} className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">
                          {game.home_team} vs {game.away_team}
                        </h3>
                        <div className="text-2xl font-bold text-red-600">
                          {game.home_score || 0} - {game.away_score || 0}
                        </div>
                      </div>
                      <Badge className="bg-red-500 text-white animate-pulse">🔴 EN VIVO</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Información del equipo */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Información del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Coach */}
                {(team.coach_name || team.coach_photo_url || isCoach) && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-300">
                        {team.coach_photo_url ? (
                          <img
                            src={team.coach_photo_url}
                            alt={`Coach ${team.coach_name || "del equipo"}`}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              const fallback = target.parentElement?.querySelector('[data-fallback]') as HTMLElement
                              if (fallback) fallback.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div
                          data-fallback
                          className="w-full h-full bg-blue-100 items-center justify-center"
                          style={{ display: team.coach_photo_url ? "none" : "flex" }}
                        >
                          <User className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Coach</p>
                      <p className="font-semibold text-gray-900">{team.coach_name || "Coach"}</p>
                      {team.coach_phone && <p className="text-gray-500 text-sm">{team.coach_phone}</p>}
                      {isCoach && (
                        <>
                          <input
                            ref={coachPhotoRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleCoachPhotoChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => coachPhotoRef.current?.click()}
                            disabled={uploadingCoachPhoto}
                            className="mt-2 h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                          >
                            {uploadingCoachPhoto ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                            {team.coach_photo_url ? "Cambiar foto" : "Subir mi foto"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Captain */}
                {(team.captain_name || team.captain_photo_url) && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-yellow-400 flex-shrink-0">
                      {team.captain_photo_url ? (
                        <img
                          src={team.captain_photo_url}
                          alt={`Capitan ${team.captain_name || "del equipo"}`}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const fallback = target.parentElement?.querySelector('[data-fallback]') as HTMLElement
                            if (fallback) fallback.style.display = "flex"
                          }}
                        />
                      ) : null}
                      <div
                        data-fallback
                        className="w-full h-full bg-yellow-100 items-center justify-center"
                        style={{ display: team.captain_photo_url ? "none" : "flex" }}
                      >
                        <Star className="w-6 h-6 text-yellow-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Capitan</p>
                      <p className="font-semibold text-gray-900">{team.captain_name || "Capitan"}</p>
                      {team.captain_phone && <p className="text-gray-500 text-sm">{team.captain_phone}</p>}
                    </div>
                  </div>
                )}

                {team.is_institutional && team.coordinator_name && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Coordinador</p>
                      <p className="font-semibold text-gray-900">{team.coordinator_name}</p>
                      {team.coordinator_phone && <p className="text-gray-500 text-sm">{team.coordinator_phone}</p>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campeonatos */}
          {championships.length > 0 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Historial de Campeonatos ({championships.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {championships.map((ch) => (
                    <div key={ch.id} className="flex items-start gap-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Medal className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900">{ch.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {ch.position && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                              {ch.position}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {ch.year}
                          </span>
                        </div>
                        {ch.tournament && <p className="text-sm text-gray-600 mt-1">{ch.tournament}</p>}
                        {ch.description && <p className="text-sm text-gray-400 mt-1">{ch.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jugadores */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Roster ({players.length} jugadores)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay jugadores registrados</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={`Foto de ${player.name}`}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              const fallback = target.parentElement?.querySelector('[data-fallback]') as HTMLElement
                              if (fallback) fallback.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div
                          data-fallback
                          className="w-full h-full items-center justify-center text-white font-bold"
                          style={{
                            display: player.photo_url ? "none" : "flex",
                            background: `linear-gradient(135deg, ${team.color1}, ${team.color2})`,
                          }}
                        >
                          #{player.jersey_number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-gray-900 font-semibold">{player.name}</h4>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <span>#{player.jersey_number}</span>
                          {player.position && (
                            <>
                              <span>{'•'}</span>
                              <span>{player.position}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Attendance */}
                      {attendanceMap[player.id] && attendanceMap[player.id].total > 0 && (
                        <div className="text-center flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-semibold text-gray-900">
                              {attendanceMap[player.id].attended}/{attendanceMap[player.id].total}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Asistencia</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Próximos partidos */}
        {upcomingGames.length > 0 && (
          <Card className="bg-white border-gray-200 mt-8">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Próximos Partidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingGames.map((game) => (
                  <div key={game.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-900 font-semibold mb-2">
                      {game.home_team} vs {game.away_team}
                    </div>
                    <div className="text-gray-600 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(game.game_date).toLocaleDateString("es-ES")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {game.game_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {game.venue} - {game.field}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados recientes */}
        {recentGames.length > 0 && (
          <Card className="bg-white border-gray-200 mt-8">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Resultados Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {recentGames.map((game) => (
                  <div key={game.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-900 font-semibold mb-2">
                      {game.home_team} vs {game.away_team}
                    </div>
                    <div className="flex items-center justify-center text-2xl font-bold text-gray-900 mb-2">
                      <span
                        className={
                          game.home_team === team.name && (game.home_score || 0) > (game.away_score || 0)
                            ? "text-green-600"
                            : game.away_team === team.name && (game.away_score || 0) > (game.home_score || 0)
                              ? "text-green-600"
                              : ""
                        }
                      >
                        {game.home_score || 0}
                      </span>
                      <span className="mx-2">-</span>
                      <span
                        className={
                          game.away_team === team.name && (game.away_score || 0) > (game.home_score || 0)
                            ? "text-green-600"
                            : game.home_team === team.name && (game.home_score || 0) > (game.away_score || 0)
                              ? "text-green-600"
                              : ""
                        }
                      >
                        {game.away_score || 0}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm">
                      {new Date(game.game_date).toLocaleDateString("es-ES")}
                      {game.mvp && (
                        <div className="flex items-center gap-1 mt-1 text-yellow-600">
                          <Star className="w-4 h-4" />
                          MVP: {game.mvp}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
