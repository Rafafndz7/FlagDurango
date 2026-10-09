"use client"

import type { ReactNode } from "react"
import { Clock, MapPin, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"
import { formatGameTime, gameDateParts } from "@/lib/game-date"

type RowTeam = { name: string; logo_url?: string | null; color1?: string | null; color2?: string | null }

export type AdminGameRowGame = {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time?: string
  venue?: string
  field?: string
  category?: string
  referee1?: string
  referee2?: string
  status: string
  home_score?: number
  away_score?: number
  jornada?: number | string | null
  is_draft?: boolean
}

export function FormSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step: number
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60", className)}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-ink font-display text-base font-extrabold italic text-white">
          {step}
        </span>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

const STATUS_CHIP: Record<string, string> = {
  programado: "bg-brand-blue/10 text-brand-blue",
  "en vivo": "bg-red-500 text-white",
  en_vivo: "bg-red-500 text-white",
  finalizado: "bg-emerald-500/10 text-emerald-700",
}

export function AdminGameRow({
  game,
  getTeam,
  statusLabel,
  categoryLabel,
  badges,
  actions,
}: {
  game: AdminGameRowGame
  getTeam: (name: string) => RowTeam | undefined
  statusLabel: string
  categoryLabel?: string
  badges?: ReactNode
  actions?: ReactNode
}) {
  const parts = gameDateParts(game.game_date)
  const home = getTeam(game.home_team)
  const away = getTeam(game.away_team)
  const isFinal = game.status === "finalizado"
  const isLive = game.status === "en vivo" || game.status === "en_vivo"
  const referees = [game.referee1, game.referee2].filter(Boolean).join(", ")

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition-shadow hover:shadow-lg",
        isLive ? "ring-2 ring-red-500/60" : game.is_draft ? "ring-amber-300" : "ring-slate-200/60",
      )}
    >
      {game.is_draft && <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" aria-hidden />}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 lg:w-[46%] lg:shrink-0">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-slate-50 py-2 ring-1 ring-slate-200">
            {parts ? (
              <>
                <span className="text-[9px] font-bold tracking-widest text-slate-500">{parts.weekday}</span>
                <span className="font-display text-2xl font-extrabold italic leading-none text-slate-900">{parts.day}</span>
                <span className="text-[9px] font-bold tracking-widest text-brand-pink">{parts.month}</span>
              </>
            ) : (
              <span className="py-2 text-xs font-bold text-slate-400">—</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2 sm:hidden">
            {[
              { name: game.home_team, team: home, score: game.home_score },
              { name: game.away_team, team: away, score: game.away_score },
            ].map((side, i) => (
              <div key={i} className="flex items-center gap-2">
                <TeamAvatar name={side.name} logoUrl={side.team?.logo_url} color1={side.team?.color1} color2={side.team?.color2} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{side.name}</span>
                {(isFinal || isLive) && (
                  <span className={cn("font-display text-xl font-extrabold italic tabular-nums", isLive ? "text-red-600" : "text-slate-900")}>
                    {side.score ?? 0}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
              <span className="truncate text-sm font-bold text-slate-900">{game.home_team}</span>
              <TeamAvatar name={game.home_team} logoUrl={home?.logo_url} color1={home?.color1} color2={home?.color2} size="sm" />
            </div>
            <div className="w-16 shrink-0 text-center">
              {isFinal || isLive ? (
                <span className={cn("font-display text-2xl font-extrabold italic tabular-nums", isLive ? "text-red-600" : "text-slate-900")}>
                  {game.home_score ?? 0}
                  <span className="mx-1 text-slate-300">-</span>
                  {game.away_score ?? 0}
                </span>
              ) : (
                <span className="font-display text-lg font-extrabold italic text-slate-300">VS</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamAvatar name={game.away_team} logoUrl={away?.logo_url} color1={away?.color1} color2={away?.color2} size="sm" />
              <span className="truncate text-sm font-bold text-slate-900">{game.away_team}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", STATUS_CHIP[game.status] || "bg-slate-100 text-slate-600")}>
              {statusLabel}
            </span>
            {categoryLabel && (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {categoryLabel}
              </span>
            )}
            {game.jornada != null && game.jornada !== "" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">J{game.jornada}</span>
            )}
            {badges}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {game.game_time && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-brand-orange" />
                {formatGameTime(game.game_time)}
              </span>
            )}
            {(game.venue || game.field) && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-pink" />
                <span className="truncate">{[game.venue, game.field].filter(Boolean).join(" · ")}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
              {referees || "Sin árbitros"}
            </span>
          </div>
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
