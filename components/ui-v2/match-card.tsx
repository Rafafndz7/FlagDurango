"use client"

import { forwardRef, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Calendar, Clock, MapPin, ShieldCheck, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatGameDate, formatGameTime, gameDateParts } from "@/lib/game-date"
import { TeamAvatar } from "./team-avatar"

export type MatchCardGame = {
  id: number
  home_team: string
  away_team: string
  home_score?: number | null
  away_score?: number | null
  game_date: string
  game_time?: string | null
  venue?: string | null
  field?: string | null
  category?: string | null
  status?: string | null
  jornada?: number | null
  match_type?: string | null
  referee1?: string | null
  referee2?: string | null
  mvp?: string | null
}

export type MatchCardTeam = { name: string; logo_url?: string | null; color1?: string | null; color2?: string | null }

type Props = {
  game: MatchCardGame
  variant: "upcoming" | "live" | "final"
  categoryLabel?: string
  getTeam?: (name: string) => MatchCardTeam | undefined
  showReferees?: boolean
  refereesText?: string
  liveSlot?: ReactNode
  badges?: ReactNode
  notice?: ReactNode
  footer?: ReactNode
  className?: string
}

const VARIANT_STYLES = {
  live: {
    ring: "ring-2 ring-red-500/70 shadow-[0_20px_50px_-20px_rgba(239,68,68,0.55)]",
    chip: "bg-red-500 text-white",
    label: "En vivo",
  },
  upcoming: {
    ring: "ring-1 ring-slate-200/80",
    chip: "bg-brand-blue/10 text-brand-blue",
    label: "Programado",
  },
  final: {
    ring: "ring-1 ring-slate-200/80",
    chip: "bg-emerald-500/10 text-emerald-700",
    label: "Final",
  },
}

export const MatchCard = forwardRef<HTMLDivElement, Props>(function MatchCard(
  { game, variant, categoryLabel, getTeam, showReferees = true, refereesText, liveSlot, badges, notice, footer, className },
  ref,
) {
  const reduce = useReducedMotion()
  const style = VARIANT_STYLES[variant]
  const home = getTeam?.(game.home_team)
  const away = getTeam?.(game.away_team)
  const parts = gameDateParts(game.game_date)
  const showScore = variant !== "upcoming"
  const homeScore = game.home_score ?? 0
  const awayScore = game.away_score ?? 0
  const homeWins = variant === "final" && homeScore > awayScore
  const awayWins = variant === "final" && awayScore > homeScore
  const referees = refereesText ?? [game.referee1, game.referee2].filter(Boolean).join(", ")

  return (
    <motion.div
      ref={ref}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("group relative h-full overflow-hidden rounded-3xl bg-white", style.ring, className)}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          variant === "live" ? "bg-red-500" : "brand-stripes opacity-80 transition-opacity group-hover:opacity-100",
        )}
      />

      <div className="flex h-full flex-col p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {categoryLabel && (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {categoryLabel}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase", style.chip)}>
            {variant === "live" && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            {style.label}
          </span>
          {game.jornada != null && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">J{game.jornada}</span>
          )}
          {badges}
        </div>

        {notice}

        <div className="flex items-center gap-3">
          <TeamSide name={game.home_team} team={home} winner={homeWins} dim={awayWins} />

          <div className="flex min-w-[96px] flex-col items-center justify-center">
            {showScore ? (
              <>
                <div
                  className={cn(
                    "font-display text-5xl font-extrabold italic leading-none tabular-nums tracking-tight",
                    variant === "live" ? "text-red-600" : "text-slate-900",
                  )}
                >
                  {homeScore}
                  <span className="mx-1.5 text-slate-300">-</span>
                  {awayScore}
                </div>
                {liveSlot}
              </>
            ) : parts ? (
              <div className="flex flex-col items-center rounded-2xl bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
                <span className="text-[10px] font-bold tracking-widest text-slate-500">{parts.weekday}</span>
                <span className="font-display text-3xl font-extrabold italic leading-none text-slate-900">{parts.day}</span>
                <span className="text-[10px] font-bold tracking-widest text-brand-pink">{parts.month}</span>
              </div>
            ) : (
              <span className="font-display text-3xl font-extrabold italic text-slate-300">VS</span>
            )}
          </div>

          <TeamSide name={game.away_team} team={away} winner={awayWins} dim={homeWins} />
        </div>

        <div className="mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-brand-blue" />
              {formatGameDate(game.game_date, { weekday: "short", day: "numeric", month: "short" })}
            </span>
            {game.game_time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-orange" />
                {formatGameTime(game.game_time)}
              </span>
            )}
          </div>
          {(game.venue || game.field) && (
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink" />
              <span>{[game.venue, game.field].filter(Boolean).join(" · ")}</span>
            </div>
          )}
          {showReferees && referees && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Árbitros: {referees}
            </div>
          )}
          {game.mvp && variant === "final" && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              MVP: {game.mvp}
            </div>
          )}
        </div>

        {footer && <div className="mt-auto pt-4">{footer}</div>}
      </div>
    </motion.div>
  )
})

function TeamSide({
  name,
  team,
  winner,
  dim,
}: {
  name: string
  team?: MatchCardTeam
  winner?: boolean
  dim?: boolean
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center text-center transition-opacity", dim && "opacity-60")}>
      <TeamAvatar
        name={name}
        logoUrl={team?.logo_url}
        color1={team?.color1}
        color2={team?.color2}
        size="lg"
        className={cn(winner && "ring-4 ring-emerald-400/70")}
      />
      <span className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-slate-900">{name}</span>
    </div>
  )
}
