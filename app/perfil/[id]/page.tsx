"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  User,
  Shield,
  Calendar,
  Trophy,
  Target,
  Zap,
  Flag as FlagIcon,
  ArrowLeft,
  MapPin,
  Star,
  TrendingUp,
  Activity,
  Crown,
  Medal,
  Hash,
} from "lucide-react"
import Link from "next/link"

const BRAND_GRADIENT = "linear-gradient(135deg, #2563eb 0%, #ec4899 50%, #f97316 100%)"

interface PlayerProfile {
  id: number
  name: string
  jersey_number?: number
  position?: string
  photo_url?: string
  team_id: number
  seasons_played?: number
  playing_since?: string
  games_played: number
  stats: {
    touchdowns: number
    interceptions: number
    sacks: number
    extra_points: number
    flags: number
  }
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
    color1?: string
    color2?: string
    coach_name?: string
  }
}

interface RankingItem {
  label: string
  stat: string
  rank: number
  total: number
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export default function PublicPlayerProfile() {
  const params = useParams()
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [rankings, setRankings] = useState<RankingItem[]>([])

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await fetch(`/api/players/${params.id}`)
        const data = await res.json()
        if (data.success) {
          setPlayer(data.data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchPlayer()
  }, [params.id])

  // Fetch rankings once the player loads
  useEffect(() => {
    if (!player) return
    const fetchRankings = async () => {
      try {
        const res = await fetch("/api/player-stats?ranking=true")
        const data = await res.json()
        if (!data.success || !data.data) return

        // Aggregate per-game stats into totals per player
        const agg: Record<number, {
          touchdowns_totales: number
          intercepciones: number
          sacks: number
          puntos_extra: number
          puntos_totales: number
          flags: number
          touchdowns_pase: number
          touchdowns_carrera: number
          touchdowns_recepcion: number
        }> = {}

        for (const row of data.data) {
          const pid = row.player_id
          if (!agg[pid]) {
            agg[pid] = {
              touchdowns_totales: 0,
              intercepciones: 0,
              sacks: 0,
              puntos_extra: 0,
              puntos_totales: 0,
              flags: 0,
              touchdowns_pase: 0,
              touchdowns_carrera: 0,
              touchdowns_recepcion: 0,
            }
          }
          agg[pid].touchdowns_totales += row.touchdowns_totales || 0
          agg[pid].intercepciones += row.intercepciones || 0
          agg[pid].sacks += row.sacks || 0
          agg[pid].puntos_extra += row.puntos_extra || 0
          agg[pid].puntos_totales += row.puntos_totales || 0
          agg[pid].flags += row.flags || 0
          agg[pid].touchdowns_pase += row.touchdowns_pase || 0
          agg[pid].touchdowns_carrera += row.touchdowns_carrera || 0
          agg[pid].touchdowns_recepcion += row.touchdowns_recepcion || 0
        }

        const playerIds = Object.keys(agg).map(Number)
        const totalPlayers = playerIds.length

        // Compute rank for a stat (1 = best)
        const getRank = (stat: keyof typeof agg[number]) => {
          const values = playerIds.map((id) => agg[id][stat]).sort((a, b) => b - a)
          const myVal = agg[player.id]?.[stat] || 0
          const rank = values.indexOf(myVal) + 1
          return { rank, value: myVal }
        }

        const categories: {
          label: string
          stat: keyof typeof agg[number]
          icon: React.ComponentType<{ className?: string }>
          color: string
        }[] = [
          { label: "Touchdowns", stat: "touchdowns_totales", icon: Trophy, color: "#2563eb" },
          { label: "Intercepciones", stat: "intercepciones", icon: Target, color: "#ec4899" },
          { label: "Sacks", stat: "sacks", icon: Zap, color: "#f97316" },
          { label: "Puntos Extra", stat: "puntos_extra", icon: Star, color: "#2563eb" },
          { label: "Puntos Totales", stat: "puntos_totales", icon: Activity, color: "#ec4899" },
          { label: "Flags", stat: "flags", icon: FlagIcon, color: "#f97316" },
          { label: "TD Pase", stat: "touchdowns_pase", icon: Trophy, color: "#2563eb" },
          { label: "TD Carrera", stat: "touchdowns_carrera", icon: Trophy, color: "#ec4899" },
          { label: "TD Recepcion", stat: "touchdowns_recepcion", icon: Trophy, color: "#f97316" },
        ]

        const computed: RankingItem[] = categories
          .map((cat) => {
            const { rank, value } = getRank(cat.stat)
            return {
              label: cat.label,
              stat: cat.stat,
              rank,
              total: totalPlayers,
              value,
              icon: cat.icon,
              color: cat.color,
            }
          })
          .filter((r) => r.value > 0) // only show categories where player has stats
          .sort((a, b) => a.rank - b.rank) // best rankings first

        setRankings(computed)
      } catch {
        // silently fail - rankings are optional
      }
    }
    fetchRankings()
  }, [player])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-[#2563eb]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#2563eb] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm tracking-wider uppercase">Cargando perfil</p>
        </div>
      </div>
    )
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-6">
            <User className="w-12 h-12 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Jugador no encontrado</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            El perfil que buscas no existe o fue removido de la liga.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: BRAND_GRADIENT }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const totalStats =
    player.stats.touchdowns +
    player.stats.interceptions +
    player.stats.sacks +
    player.stats.extra_points +
    player.stats.flags

  const statItems = [
    {
      icon: Trophy,
      label: "Touchdowns",
      value: player.stats.touchdowns,
      color: "#2563eb",
    },
    {
      icon: Target,
      label: "Intercepciones",
      value: player.stats.interceptions,
      color: "#ec4899",
    },
    {
      icon: Zap,
      label: "Sacks",
      value: player.stats.sacks,
      color: "#f97316",
    },
    {
      icon: Star,
      label: "Puntos Extra",
      value: player.stats.extra_points,
      color: "#2563eb",
    },
    {
      icon: FlagIcon,
      label: "Flags",
      value: player.stats.flags,
      color: "#ec4899",
    },
  ].filter((s) => s.value > 0)

  return (
    <div className="min-h-screen bg-gray-50/50 relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Inicio</span>
          </Link>
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-medium">
            Liga Flag Durango
          </span>
        </div>

        {/* Hero card */}
        <div className="relative mt-2">
          <div className="relative rounded-3xl overflow-hidden bg-white shadow-lg shadow-gray-200/60 border border-gray-100">
            {/* Gradient header band */}
            <div
              className="h-36 relative"
              style={{ background: BRAND_GRADIENT }}
            >
              {/* Subtle dot pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Team badge top-right */}
              {player.teams && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                    {player.teams.logo_url ? (
                      <img
                        src={player.teams.logo_url}
                        alt={player.teams.name}
                        className="w-5 h-5 rounded-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-[11px] text-white font-medium">
                      {player.teams.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Player photo overlapping the gradient */}
            <div className="flex flex-col items-center -mt-16 relative z-10 px-6 pb-6">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <User className="w-14 h-14 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Jersey number badge */}
                {player.jersey_number && (
                  <div
                    className="absolute -bottom-1 -right-1 w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-white"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {player.jersey_number}
                  </div>
                )}
              </div>

              {/* Name */}
              <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center text-balance leading-tight">
                {player.name}
              </h1>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                {player.position && (
                  <span
                    className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {player.position}
                  </span>
                )}
                {player.teams?.category && (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200">
                    {player.teams.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats ribbon */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <QuickStatBox label="Partidos" value={player.games_played} />
          <QuickStatBox label="Touchdowns" value={player.stats.touchdowns} />
          <QuickStatBox label="Total Stats" value={totalStats} />
        </div>

        {/* Rankings section */}
        {rankings.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-4 px-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: BRAND_GRADIENT }}
              >
                <Crown className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Ranking en la Liga
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {rankings.slice(0, 6).map((r) => {
                const Icon = r.icon
                const isTop3 = r.rank <= 3
                return (
                  <div
                    key={r.stat}
                    className="relative rounded-2xl overflow-hidden border bg-white shadow-sm p-4"
                    style={{ borderColor: isTop3 ? `${r.color}30` : undefined }}
                  >
                    {/* Top 3 highlight */}
                    {isTop3 && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                        style={{ background: BRAND_GRADIENT }}
                      />
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${r.color}12`, color: r.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium leading-tight truncate">
                        {r.label}
                      </span>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline gap-1">
                        {isTop3 ? (
                          <span
                            className="text-2xl font-black bg-clip-text text-transparent"
                            style={{ backgroundImage: BRAND_GRADIENT }}
                          >
                            #{r.rank}
                          </span>
                        ) : (
                          <span className="text-2xl font-black text-gray-800">
                            #{r.rank}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-300 font-medium">
                          /{r.total}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-semibold tabular-nums">
                        {r.value} pts
                      </span>
                    </div>

                    {/* Medal icon for top 3 */}
                    {r.rank === 1 && (
                      <div className="absolute top-2.5 right-2.5">
                        <Medal className="w-4 h-4 text-yellow-400" />
                      </div>
                    )}
                    {r.rank === 2 && (
                      <div className="absolute top-2.5 right-2.5">
                        <Medal className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    {r.rank === 3 && (
                      <div className="absolute top-2.5 right-2.5">
                        <Medal className="w-4 h-4 text-amber-600" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* If more than 6 rankings, show them in a compact list */}
            {rankings.length > 6 && (
              <div className="mt-2.5 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                {rankings.slice(6).map((r, i) => {
                  const Icon = r.icon
                  return (
                    <div
                      key={r.stat}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        i < rankings.length - 7 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${r.color}12`, color: r.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-500 flex-1">{r.label}</span>
                      <span className="text-sm font-bold text-gray-700">#{r.rank}</span>
                      <span className="text-[10px] text-gray-300">/{r.total}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Detailed stats */}
        {statItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-4 px-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: BRAND_GRADIENT }}
              >
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Estadisticas
              </h2>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
              {statItems.map((stat, i) => {
                const Icon = stat.icon
                const maxVal = Math.max(...statItems.map((s) => s.value), 1)
                const pct = (stat.value / maxVal) * 100

                return (
                  <div
                    key={stat.label}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      i < statItems.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${stat.color}12`, color: stat.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-500">{stat.label}</span>
                        <span className="text-lg font-black text-gray-900 tabular-nums">
                          {stat.value}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: BRAND_GRADIENT,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Player info */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: BRAND_GRADIENT }}
            >
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Informacion
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
            {player.teams && (
              <InfoRow
                icon={Shield}
                label="Equipo"
                value={player.teams.name}
                iconColor="#2563eb"
                hasBorder
              />
            )}
            {player.position && (
              <InfoRow
                icon={MapPin}
                label="Posicion"
                value={player.position}
                iconColor="#ec4899"
                hasBorder
              />
            )}
            {player.teams?.category && (
              <InfoRow
                icon={TrendingUp}
                label="Categoria"
                value={player.teams.category}
                iconColor="#f97316"
                hasBorder
              />
            )}
            {player.playing_since && (
              <InfoRow
                icon={Calendar}
                label="Jugando desde"
                value={player.playing_since}
                iconColor="#2563eb"
                hasBorder
              />
            )}
            {player.seasons_played != null && player.seasons_played > 0 && (
              <InfoRow
                icon={Trophy}
                label="Temporadas jugadas"
                value={`${player.seasons_played}`}
                iconColor="#ec4899"
                hasBorder={false}
              />
            )}
            {player.teams?.coach_name && (
              <InfoRow
                icon={Star}
                label="Head Coach"
                value={player.teams.coach_name}
                iconColor="#f97316"
                hasBorder={false}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-[2px] rounded-full" style={{ background: BRAND_GRADIENT }} />
            <FlagIcon className="w-3.5 h-3.5 text-gray-400" />
            <div className="w-8 h-[2px] rounded-full" style={{ background: BRAND_GRADIENT }} />
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-semibold">
            Liga Flag Durango
          </p>
          <p className="text-[10px] text-gray-300 mt-0.5">20 Anos Haciendo Historia</p>
        </div>
      </div>
    </div>
  )
}

function QuickStatBox({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm p-4 text-center">
      <p
        className="text-2xl font-black tabular-nums bg-clip-text text-transparent"
        style={{ backgroundImage: BRAND_GRADIENT }}
      >
        {value}
      </p>
      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
        {label}
      </p>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  iconColor,
  hasBorder,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  iconColor: string
  hasBorder: boolean
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 ${
        hasBorder ? "border-b border-gray-100" : ""
      }`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}12`, color: iconColor }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  )
}
