"use client"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Castle as Whistle } from "lucide-react"

interface Game {
  id: number
  home_team: string
  away_team: string
  home_score?: number | null
  away_score?: number | null
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  status: string
  match_type?: string
  jornada?: number
  referee1?: string | null
  referee2?: string | null
  mvp?: string | null
  stage?: string | null
}

interface Team {
  id: number
  name: string
  category: string
  color1: string
  color2: string
  logo_url?: string | null
}

interface GameShareCardProps {
  game: Game
  teams: Team[]
}

export default function GameShareCard({ game, teams }: GameShareCardProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "femenil-silver": "bg-pink-400",
      "femenil-gold": "bg-pink-500",
      "femenil-cooper": "bg-pink-600",
      "varonil-silver": "bg-blue-400",
      "varonil-gold": "bg-blue-500",
      "mixto-silver": "bg-orange-400",
      "mixto-gold": "bg-orange-500",
    }
    return colors[category] || "bg-gray-500"
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "femenil-silver": "Femenil Silver",
      "femenil-gold": "Femenil Gold",
      "femenil-cooper": "Femenil Cooper",
      "varonil-silver": "Varonil Silver",
      "varonil-gold": "Varonil Gold",
      "mixto-silver": "Mixto Silver",
      "mixto-gold": "Mixto Gold",
    }
    return labels[category] || category
  }

  const getTeamLogo = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName)
    return team?.logo_url || null
  }

  const getTeamColors = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName)
    return {
      color1: team?.color1 || "#3B82F6",
      color2: team?.color2 || "#1E40AF",
    }
  }

  const getReferees = (game: Game) => {
    const refs = [game.referee1, game.referee2].filter(Boolean)
    return refs.length > 0 ? refs.join(", ") : "Sin asignar"
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "programado":
        return "PRÓXIMO PARTIDO"
      case "en_vivo":
      case "en vivo":
        return "EN VIVO"
      case "finalizado":
        return "FINALIZADO"
      default:
        return "PARTIDO"
    }
  }

  const renderTeam = (name: string, isHome = true) => {
    const logo = getTeamLogo(name)
    const colors = getTeamColors(name)

    return (
      <div className="flex flex-col items-center text-center flex-1">
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 overflow-hidden border-3 border-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2})` }}
        >
          {logo ? (
            <img
              src={logo || "/placeholder.svg"}
              alt={`Logo de ${name}`}
              className="h-full w-full object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const parent = target.parentElement
                if (parent) {
                  target.style.display = "none"
                  parent.innerHTML = `<span class="text-2xl font-bold">${name.charAt(0)}</span>`
                }
              }}
            />
          ) : (
            name.charAt(0)
          )}
        </div>
        <span className="font-bold text-lg text-gray-800 text-center leading-tight max-w-[120px]">{name}</span>
      </div>
    )
  }

  return (
    <div className="w-[600px] bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Header con gradiente */}
      <div
        className="h-24 flex items-center justify-center text-white text-2xl font-bold"
        style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed, #dc2626)" }}
      >
        🏈 Liga Flag Durango
      </div>

      {/* Status Badge */}
      <div className="flex justify-center py-4 bg-gray-50">
        <div
          className="px-6 py-2 rounded-full text-white font-bold text-lg"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        >
          🏈 {getStatusLabel(game.status)}
        </div>
      </div>

      {/* Equipos y marcador */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="flex items-center justify-center gap-8">
          {/* Equipo Local */}
          {renderTeam(game.home_team, true)}

          {/* VS o Marcador */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            {game.status === "finalizado" ? (
              <div className="text-4xl font-bold text-gray-800">
                {game.home_score ?? 0} - {game.away_score ?? 0}
              </div>
            ) : game.status === "en_vivo" || game.status === "en vivo" ? (
              <>
                <div className="text-4xl font-bold text-red-500">
                  {game.home_score ?? 0} - {game.away_score ?? 0}
                </div>
                <div className="text-xs text-red-500 font-bold">EN VIVO</div>
              </>
            ) : (
              <div className="text-4xl font-bold text-gray-800">VS</div>
            )}
          </div>

          {/* Equipo Visitante */}
          {renderTeam(game.away_team, false)}
        </div>
      </div>

      {/* Información del partido */}
      <div className="p-6 space-y-4 bg-white">
        {/* Categoría */}
        <div className="flex justify-center">
          <Badge className={`${getCategoryColor(game.category)} text-white text-sm px-4 py-1`}>
            {getCategoryLabel(game.category)}
          </Badge>
          {game.status === "programado" && (
            <Badge className="bg-blue-600 text-white text-sm px-4 py-1 ml-2">Programado</Badge>
          )}
        </div>

        {/* Fecha y hora */}
        <div className="flex items-center justify-center text-gray-700 text-lg">
          <Calendar className="w-5 h-5 mr-2 text-blue-500" />
          {new Date(game.game_date).toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>

        <div className="flex items-center justify-center text-gray-700 text-lg">
          <Clock className="w-5 h-5 mr-2 text-blue-500" />
          {game.game_time}
        </div>

        {/* Venue */}
        <div className="flex items-center justify-center text-gray-700 text-lg">
          <MapPin className="w-5 h-5 mr-2 text-blue-500" />
          {game.venue} - {game.field}
        </div>

        {/* Árbitros */}
        <div className="flex items-center justify-center text-gray-700 text-lg">
          <Whistle className="w-5 h-5 mr-2 text-blue-500" />
          Árbitros: {getReferees(game)}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white text-center py-4">
        <div className="text-xl font-bold">Liga Flag Durango</div>
        <div className="text-sm text-gray-300">20 años haciendo historia</div>
      </div>
    </div>
  )
}
