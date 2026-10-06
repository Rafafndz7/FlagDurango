"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, CalendarDays, Inbox, Medal, Plus, Trophy, UserPlus, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { CountUp, EASE_OUT } from "@/components/ui-v2/motion"
import { MatchCard, type MatchCardGame, type MatchCardTeam } from "@/components/ui-v2/match-card"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"

type CoachTeam = MatchCardTeam & { id: number; name: string; category: string; paid?: boolean }

type CoachOverviewProps = {
  teams: CoachTeam[]
  playersCount: number
  gamesCount: number
  pendingRequests: number
  showRequests: boolean
  upcoming: MatchCardGame[]
  recent: MatchCardGame[]
  getTeam: (name: string) => MatchCardTeam | undefined
  getCategoryLabel: (category: string) => string
  onNavigate: (tab: string) => void
  onAddPlayer: () => void
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60", className)}>{children}</div>
}

function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  )
}

function PillButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-900 hover:text-white hover:ring-slate-900"
    >
      {children}
    </button>
  )
}

function EmptyNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
      <span className="mb-2 text-slate-300">{icon}</span>
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  )
}

const cardVariant = (status?: string | null) =>
  status === "en_vivo" || status === "en vivo" ? "live" : status === "finalizado" ? "final" : "upcoming"

export function CoachOverview({
  teams,
  playersCount,
  gamesCount,
  pendingRequests,
  showRequests,
  upcoming,
  recent,
  getTeam,
  getCategoryLabel,
  onNavigate,
  onAddPlayer,
}: CoachOverviewProps) {
  const reduce = useReducedMotion()
  const paidTeams = teams.filter((t) => t.paid).length

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE_OUT, delay: 0.05 * i },
  })

  const kpis = [
    { label: "Equipos", value: teams.length, hint: `${paidTeams} con inscripción pagada`, tab: "teams", icon: Trophy },
    { label: "Jugadores", value: playersCount, hint: "En tu roster de la temporada", tab: "players", icon: Users },
    { label: "Partidos", value: gamesCount, hint: `${upcoming.length} por jugar`, tab: "games", icon: CalendarDays },
    {
      label: "Solicitudes",
      value: pendingRequests,
      hint: pendingRequests ? "Jugadores esperan respuesta" : "Todo al día",
      tab: showRequests ? "requests" : "players",
      icon: Inbox,
    },
  ]

  return (
    <div className="ui-v2 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const featured = i === 0
          const Icon = k.icon
          return (
            <motion.button
              key={k.label}
              type="button"
              onClick={() => onNavigate(k.tab)}
              {...item(i)}
              whileHover={reduce ? undefined : { y: -4 }}
              className={cn(
                "group relative isolate overflow-hidden rounded-3xl p-4 text-left transition-shadow sm:p-5",
                featured
                  ? "bg-brand-ink text-white shadow-[0_18px_40px_-20px_rgba(8,87,181,0.7)]"
                  : "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60 hover:shadow-lg",
              )}
            >
              {featured && (
                <>
                  <div className="absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-brand-blue/60 blur-3xl" aria-hidden />
                  <div className="absolute -bottom-20 left-10 -z-10 h-40 w-40 rounded-full bg-brand-pink/40 blur-3xl" aria-hidden />
                  <div className="brand-stripes absolute inset-x-0 bottom-0 h-1" aria-hidden />
                </>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", featured ? "text-white/70" : "text-slate-400")} />
                  <span className={cn("text-sm font-medium", featured ? "text-white/90" : "text-slate-700")}>{k.label}</span>
                </div>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:rotate-45",
                    featured ? "bg-white text-slate-900" : "text-slate-700 ring-1 ring-slate-300",
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <CountUp value={k.value} className="mt-3 block text-4xl font-bold tracking-tight sm:mt-4 sm:text-5xl" />
              <p className={cn("mt-2 line-clamp-2 text-[11px] sm:text-xs", featured ? "text-white/60" : "text-slate-500")}>{k.hint}</p>
              {k.label === "Solicitudes" && pendingRequests > 0 && (
                <span className="absolute right-12 top-5 flex h-2.5 w-2.5 sm:right-14 sm:top-6">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-orange" />
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div {...item(4)} className="xl:col-span-2">
          <Panel className="h-full">
            <PanelTitle action={<PillButton onClick={() => onNavigate("games")}>Ver todos</PillButton>}>Próximos partidos</PanelTitle>
            {upcoming.length === 0 ? (
              <EmptyNote icon={<CalendarDays className="h-8 w-8" />}>Los partidos aparecerán aquí cuando sean programados.</EmptyNote>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.slice(0, 2).map((g) => (
                  <MatchCard
                    key={g.id}
                    game={g}
                    variant={cardVariant(g.status)}
                    categoryLabel={g.category ? getCategoryLabel(g.category) : undefined}
                    getTeam={getTeam}
                    className="bg-slate-50/40"
                  />
                ))}
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div {...item(5)}>
          <Panel className="flex h-full flex-col">
            <PanelTitle action={<PillButton onClick={() => onNavigate("teams")}>Administrar</PillButton>}>Mis equipos</PanelTitle>
            {teams.length === 0 ? (
              <EmptyNote icon={<Trophy className="h-8 w-8" />}>Aún no tienes equipo en esta temporada.</EmptyNote>
            ) : (
              <ul className="space-y-3">
                {teams.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/60">
                    <TeamAvatar name={t.name} logoUrl={t.logo_url} color1={t.color1} color2={t.color2} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{t.name}</p>
                      <p className="truncate text-xs text-slate-500">{getCategoryLabel(t.category)}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold",
                        t.paid ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                      )}
                    >
                      {t.paid ? "Pagado" : "Pendiente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <button
                type="button"
                onClick={onAddPlayer}
                disabled={teams.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-brand transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Jugador
              </button>
              <button
                type="button"
                onClick={() => onNavigate("create")}
                className="flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-900 hover:text-white hover:ring-slate-900"
              >
                <Plus className="h-4 w-4" />
                Equipo
              </button>
            </div>
          </Panel>
        </motion.div>
      </div>

      <motion.div {...item(6)}>
        <Panel>
          <PanelTitle action={<PillButton onClick={() => onNavigate("championships")}><Medal className="h-3.5 w-3.5" />Campeonatos</PillButton>}>
            Resultados recientes
          </PanelTitle>
          {recent.length === 0 ? (
            <EmptyNote icon={<Trophy className="h-8 w-8" />}>Todavía no hay resultados de tus equipos.</EmptyNote>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recent.slice(0, 3).map((g) => (
                <MatchCard
                  key={g.id}
                  game={g}
                  variant="final"
                  categoryLabel={g.category ? getCategoryLabel(g.category) : undefined}
                  getTeam={getTeam}
                  showReferees={false}
                  className="bg-slate-50/40"
                />
              ))}
            </div>
          )}
        </Panel>
      </motion.div>
    </div>
  )
}
