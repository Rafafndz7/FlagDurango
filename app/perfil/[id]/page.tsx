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
} from "lucide-react"
import Link from "next/link"

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

export default function PublicPlayerProfile() {
  const params = useParams()
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayer = async () => {
      const res = await fetch(`/api/players/${params.id}`)
      const data = await res.json()
      if (data.success) setPlayer(data.data)
      setLoading(false)
    }
    if (params.id) fetchPlayer()
  }, [params.id])

  if (loading)
    return (
      <div className="min-h-screen bg-[#05070f] flex items-center justify-center text-slate-500">
        Loading player…
      </div>
    )

  if (!player)
    return <div className="min-h-screen bg-[#05070f] text-white flex items-center justify-center">Not found</div>

  const teamColor = player.teams?.color1 || "#2563eb"

  const totalStats =
    player.stats.touchdowns +
    player.stats.interceptions +
    player.stats.sacks +
    player.stats.extra_points +
    player.stats.flags

  return (
    <div className="min-h-screen bg-[#05070f] text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% -10%, ${teamColor}30, transparent 60%)`,
        }}
      />

      {/* CONTAINER NFL */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-20">

        {/* TOP BAR */}
        <div className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft size={18} /> Inicio
          </Link>
          <span className="text-xs text-slate-500 tracking-widest uppercase">
            Liga Flag Durango
          </span>
        </div>

        {/* HERO NFL CARD */}
        <div
          className="relative rounded-[42px] p-8 border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(180deg, ${teamColor}22, #0b0f1f)`,
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">

            {/* FOTO */}
            <div className="relative">
              <div
                className="absolute inset-0 blur-3xl opacity-40 rounded-full"
                style={{ background: teamColor }}
              />
              <div
                className="relative w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-4"
                style={{ borderColor: `${teamColor}80` }}
              >
                {player.photo_url ? (
                  <img src={player.photo_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <User size={60} />
                  </div>
                )}
              </div>

              {player.jersey_number && (
                <div
                  className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl"
                  style={{ background: teamColor }}
                >
                  {player.jersey_number}
                </div>
              )}
            </div>

            {/* INFO */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black">{player.name}</h1>

              <div className="flex gap-3 mt-4 justify-center md:justify-start flex-wrap">
                {player.position && (
                  <span className="px-4 py-1 rounded-full bg-white/10 text-sm font-bold">
                    {player.position}
                  </span>
                )}
                {player.teams?.category && (
                  <span className="px-4 py-1 rounded-full bg-white/10 text-sm font-bold">
                    {player.teams.category}
                  </span>
                )}
              </div>

              {/* BIG STATS NFL */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <StatBig label="Games" value={player.games_played} />
                <StatBig label="TD" value={player.stats.touchdowns} />
                <StatBig label="Total" value={totalStats} />
              </div>
            </div>
          </div>
        </div>

        {/* STATS LIST */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <StatCard icon={Trophy} label="Touchdowns" value={player.stats.touchdowns}/>
          <StatCard icon={Target} label="Interceptions" value={player.stats.interceptions}/>
          <StatCard icon={Zap} label="Sacks" value={player.stats.sacks}/>
          <StatCard icon={FlagIcon} label="Flags" value={player.stats.flags}/>
        </div>

        {/* INFO */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Info label="Equipo" value={player.teams?.name}/>
          <Info label="Coach" value={player.teams?.coach_name}/>
          <Info label="Desde" value={player.playing_since}/>
          <Info label="Temporadas" value={player.seasons_played?.toString()}/>
        </div>

      </div>
    </div>
  )
}

/* COMPONENTES */

function StatBig({ label, value }: any) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs text-slate-400 uppercase">{label}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex items-center gap-4">
      <Icon className="text-slate-400"/>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  )
}

function Info({ label, value }: any) {
  if (!value) return null
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}