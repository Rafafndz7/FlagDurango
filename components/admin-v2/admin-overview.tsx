"use client"

import { useMemo, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  Clock,
  DollarSign,
  MapPin,
  QrCode,
  Shield,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CountUp, EASE_OUT } from "@/components/ui-v2/motion"
import { dateKey, formatGameDate, formatGameTime, gameDateParts, localDateKey } from "@/lib/game-date"

type OverviewTeam = { id?: any; name: string; category?: string; season_id?: string; paid?: boolean }
type OverviewPlayer = { id?: any; team_id?: any; admin_verified?: boolean }
type OverviewGame = {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time: string
  venue?: string
  field?: string
  category: string
  status: string
  season_id?: string
  is_draft?: boolean
}
type OverviewPayment = { amount: number; status: string }
type OverviewRequest = {
  id: number
  player_name: string
  position?: string
  status: string
  is_transfer?: boolean
  created_at?: string
  teams?: { name: string; category: string }
}
type OverviewCoachPermission = { approved_by_admin: boolean }

type AdminOverviewProps = {
  username: string
  teams: OverviewTeam[]
  players: OverviewPlayer[]
  games: OverviewGame[]
  payments: OverviewPayment[]
  joinRequests: OverviewRequest[]
  coachPermissions: OverviewCoachPermission[]
  activeSeasonId: string
  activeSeasonName?: string
  onNavigate: (tab: string) => void
}

const categoryLabel = (c?: string) =>
  String(c || "Sin categoría")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

const categoryShort = (c?: string) =>
  String(c || "?")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase())
    .join("")

const isLive = (s: string) => s === "en vivo" || s === "en_vivo"
const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })

const BAR_COLORS = ["bg-brand-ink", "bg-brand-blue", "bg-brand-pink", "bg-brand-orange"]

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

function PillButton({ onClick, children, dark }: { onClick: () => void; children: ReactNode; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        dark ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" : "text-slate-700 ring-1 ring-slate-300 hover:bg-slate-900 hover:text-white hover:ring-slate-900",
      )}
    >
      {children}
    </button>
  )
}

export function AdminOverview({
  username,
  teams,
  players,
  games,
  payments,
  joinRequests,
  coachPermissions,
  activeSeasonId,
  activeSeasonName,
  onNavigate,
}: AdminOverviewProps) {
  const reduce = useReducedMotion()

  const data = useMemo(() => {
    const seasonTeams = activeSeasonId ? teams.filter((t) => t.season_id === activeSeasonId) : teams
    const seasonTeamIds = new Set(seasonTeams.map((t) => String(t.id)))
    const seasonPlayers = players.filter((p) => seasonTeamIds.has(String(p.team_id)))
    const seasonGames = games.filter((g) => !g.is_draft && (!activeSeasonId || !g.season_id || g.season_id === activeSeasonId))

    const finished = seasonGames.filter((g) => g.status === "finalizado").length
    const live = seasonGames.filter((g) => isLive(g.status))
    const scheduled = seasonGames.filter((g) => g.status === "programado").length

    const today = localDateKey(new Date())
    const upcoming = seasonGames
      .filter((g) => g.status === "programado" && dateKey(g.game_date) >= today)
      .sort((a, b) => `${dateKey(a.game_date)} ${a.game_time || ""}`.localeCompare(`${dateKey(b.game_date)} ${b.game_time || ""}`))

    const pendingRequests = joinRequests.filter((r) => r.status === "pending" || r.status === "pending_coordinator")
    const pendingCoaches = coachPermissions.filter((c) => !c.approved_by_admin).length

    const unpaid = payments.filter((p) => p.status !== "paid")
    const unpaidTotal = unpaid.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const overdue = payments.filter((p) => p.status === "overdue").length

    const byCategory = new Map<string, number>()
    seasonTeams.forEach((t) => byCategory.set(t.category || "sin-categoria", (byCategory.get(t.category || "sin-categoria") || 0) + 1))
    const categories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)

    return {
      seasonTeams,
      paidTeams: seasonTeams.filter((t) => t.paid).length,
      seasonPlayers,
      verifiedPlayers: seasonPlayers.filter((p) => p.admin_verified).length,
      seasonGames,
      finished,
      live,
      scheduled,
      upcoming,
      pendingRequests,
      pendingCoaches,
      unpaidCount: unpaid.length,
      unpaidTotal,
      overdue,
      categories,
    }
  }, [teams, players, games, payments, joinRequests, coachPermissions, activeSeasonId])

  const totalGames = data.seasonGames.length
  const progress = totalGames ? Math.round((data.finished / totalGames) * 100) : 0
  const maxCat = Math.max(1, ...data.categories.map(([, n]) => n))
  const nextGame = data.upcoming[0]
  const nextParts = nextGame ? gameDateParts(nextGame.game_date) : null

  const kpis = [
    {
      label: "Equipos",
      value: data.seasonTeams.length,
      hint: `${data.paidTeams} con inscripción pagada`,
      tab: "teams",
      icon: Users,
    },
    {
      label: "Jugadores",
      value: data.seasonPlayers.length,
      hint: `${data.verifiedPlayers} verificados`,
      tab: "players",
      icon: Shield,
    },
    {
      label: "Partidos",
      value: totalGames,
      hint: `${data.finished} finalizados · ${data.scheduled} programados`,
      tab: "games",
      icon: CalendarDays,
    },
    {
      label: "Pendientes",
      value: data.pendingRequests.length + data.pendingCoaches,
      hint: `${data.pendingRequests.length} solicitudes · ${data.pendingCoaches} coaches`,
      tab: "requests",
      icon: UserPlus,
    },
  ]

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE_OUT, delay: 0.04 * i },
  })

  // Semicírculo del avance de temporada
  const R = 80
  const arc = Math.PI * R
  const finishedLen = totalGames ? (data.finished / totalGames) * arc : 0
  const liveLen = totalGames ? (data.live.length / totalGames) * arc : 0

  return (
    <div className="ui-v2 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                "group relative isolate overflow-hidden rounded-3xl p-5 text-left transition-shadow",
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
                    featured ? "bg-white text-slate-900" : "ring-1 ring-slate-300 text-slate-700",
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <CountUp value={k.value} className="mt-4 block text-5xl font-bold tracking-tight" />
              <p className={cn("mt-2 text-xs", featured ? "text-white/60" : "text-slate-500")}>{k.hint}</p>
            </motion.button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <motion.div {...item(4)} className="lg:col-span-2">
          <Panel className="h-full">
            <PanelTitle action={<PillButton onClick={() => onNavigate("teams")}>Ver equipos</PillButton>}>
              Equipos por categoría
            </PanelTitle>
            {data.categories.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Aún no hay equipos en la temporada activa.</p>
            ) : (
              <div className="flex h-48 items-end justify-around gap-2 pt-6">
                {data.categories.map(([cat, n], i) => {
                  const pct = Math.max(18, Math.round((n / maxCat) * 100))
                  const hatched = n / maxCat < 0.35
                  return (
                    <div key={cat} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${categoryLabel(cat)}: ${n}`}>
                      <div className="relative flex w-full max-w-[56px] flex-1 items-end">
                        <motion.div
                          initial={reduce ? false : { height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.15 + i * 0.06 }}
                          className={cn(
                            "relative w-full rounded-full",
                            hatched
                              ? "bg-[repeating-linear-gradient(135deg,#cbd5e1_0_2px,transparent_2px_8px)] ring-1 ring-slate-300"
                              : BAR_COLORS[i % BAR_COLORS.length],
                          )}
                        >
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow ring-1 ring-slate-200">
                            {n}
                          </span>
                        </motion.div>
                      </div>
                      <span className="w-full truncate text-center text-[11px] font-semibold text-slate-500">{categoryShort(cat)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div {...item(5)}>
          <Panel className="flex h-full flex-col">
            <PanelTitle>Próximo partido</PanelTitle>
            {nextGame ? (
              <>
                <div className="flex items-center gap-3">
                  {nextParts && (
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-slate-100 py-2">
                      <span className="text-[10px] font-bold text-brand-pink">{nextParts.weekday}</span>
                      <span className="text-2xl font-bold leading-none text-slate-900">{nextParts.day}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{nextParts.month}</span>
                    </div>
                  )}
                  <p className="text-lg font-bold leading-snug text-brand-blue">
                    {nextGame.home_team} <span className="text-slate-400">vs</span> {nextGame.away_team}
                  </p>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatGameTime(nextGame.game_time) || "Hora por definir"} · {categoryLabel(nextGame.category)}
                  </p>
                  {(nextGame.venue || nextGame.field) && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[nextGame.venue, nextGame.field].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No hay partidos programados próximamente.</p>
            )}
            <div className="mt-auto pt-5">
              <button
                type="button"
                onClick={() => onNavigate("games")}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-brand transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <CalendarClock className="h-4 w-4" />
                Gestionar partidos
              </button>
            </div>
          </Panel>
        </motion.div>

        <motion.div {...item(6)}>
          <Panel className="h-full">
            <PanelTitle action={<PillButton onClick={() => onNavigate("requests")}>Ver todas</PillButton>}>Solicitudes</PanelTitle>
            {data.pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Sparkles className="mb-2 h-6 w-6 text-brand-pink" />
                <p className="text-sm text-slate-500">Todo al día. No hay solicitudes pendientes.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {data.pendingRequests.slice(0, 5).map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                        BAR_COLORS[(i + 1) % BAR_COLORS.length],
                      )}
                    >
                      {r.player_name
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.player_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {r.teams?.name || "Equipo"} {r.is_transfer ? "· Transferencia" : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <motion.div {...item(7)} className="lg:col-span-2">
          <Panel className="h-full">
            <PanelTitle action={<PillButton onClick={() => onNavigate("games")}>Ver calendario</PillButton>}>
              {data.live.length > 0 ? "En vivo y próximos" : "Próximos partidos"}
            </PanelTitle>
            {data.live.length === 0 && data.upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Sin partidos por jugar.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...data.live, ...data.upcoming].slice(0, 5).map((g) => (
                  <li key={g.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">
                      {formatGameDate(g.game_date, { day: "2-digit", month: "short" })}
                      <span className="block text-slate-400">{formatGameTime(g.game_time)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {g.home_team} <span className="font-normal text-slate-400">vs</span> {g.away_team}
                      </p>
                      <p className="truncate text-xs text-slate-500">{categoryLabel(g.category)}</p>
                    </div>
                    {isLive(g.status) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 ring-1 ring-red-200">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        En vivo
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-brand-blue ring-1 ring-blue-200">
                        Programado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>

        <motion.div {...item(8)}>
          <Panel className="h-full">
            <PanelTitle>Avance de temporada</PanelTitle>
            <div className="relative mx-auto w-full max-w-[220px]">
              <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
                <defs>
                  <linearGradient id="admin-gauge" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#0857b5" />
                    <stop offset="55%" stopColor="#e266be" />
                    <stop offset="100%" stopColor="#ff6d06" />
                  </linearGradient>
                  <pattern id="admin-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="2.5" />
                  </pattern>
                </defs>
                <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#admin-hatch)" strokeWidth="22" strokeLinecap="round" />
                <motion.path
                  d="M20 100 A80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#admin-gauge)"
                  strokeWidth="22"
                  strokeLinecap="round"
                  strokeDasharray={`${arc} ${arc}`}
                  initial={reduce ? false : { strokeDashoffset: arc }}
                  animate={{ strokeDashoffset: arc - finishedLen }}
                  transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
                />
                {liveLen > 0 && (
                  <path
                    d="M20 100 A80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#0b0b12"
                    strokeWidth="22"
                    strokeDasharray={`0 ${finishedLen} ${liveLen} ${arc}`}
                  />
                )}
              </svg>
              <div className="absolute inset-x-0 bottom-0 text-center">
                <p className="text-4xl font-bold tracking-tight text-slate-900">
                  <CountUp value={progress} />%
                </p>
                <p className="text-xs text-slate-500">Partidos jugados</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-gradient" />
                Finalizados ({data.finished})
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-ink" />
                En vivo ({data.live.length})
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[repeating-linear-gradient(135deg,#94a3b8_0_1.5px,transparent_1.5px_4px)] ring-1 ring-slate-300" />
                Programados ({data.scheduled})
              </li>
            </ul>
          </Panel>
        </motion.div>

        <motion.div {...item(9)}>
          <div className="relative isolate flex h-full flex-col overflow-hidden rounded-3xl bg-brand-ink p-5 text-white">
            <div className="absolute inset-0 -z-10 bg-grid-white opacity-50" aria-hidden />
            <div className="absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full bg-brand-orange/40 blur-3xl" aria-hidden />
            <div className="absolute -bottom-16 -left-10 -z-10 h-44 w-44 rounded-full bg-brand-blue/50 blur-3xl" aria-hidden />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Por cobrar</h2>
              <DollarSign className="h-4 w-4 text-white/60" />
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight">{money(data.unpaidTotal)}</p>
            <p className="mt-1 text-xs text-white/60">
              {data.unpaidCount} pagos pendientes{data.overdue ? ` · ${data.overdue} vencidos` : ""}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <PillButton dark onClick={() => onNavigate("finanzas")}>
                Finanzas
              </PillButton>
              <PillButton dark onClick={() => onNavigate("debts")}>
                Deudas
              </PillButton>
              <PillButton dark onClick={() => onNavigate("arbitraje")}>
                Arbitraje
              </PillButton>
            </div>
            <div className="brand-stripes absolute inset-x-0 bottom-0 h-1" aria-hidden />
          </div>
        </motion.div>
      </div>

      <motion.div {...item(10)}>
        <Panel>
          <PanelTitle>Accesos rápidos</PanelTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { tab: "schedule-generator", label: "Generar rol", icon: CalendarDays },
              { tab: "quick-manager", label: "Gestión rápida", icon: Target },
              { tab: "stats", label: "Estadísticas", icon: Sparkles },
              { tab: "qr", label: "Códigos QR", icon: QrCode },
              { tab: "asignacion-arbitros", label: "Árbitros", icon: Shield },
              { tab: "usuarios", label: "Usuarios", icon: Users },
            ].map((a) => {
              const Icon = a.icon
              return (
                <motion.button
                  key={a.tab}
                  type="button"
                  onClick={() => onNavigate(a.tab)}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  className="group flex flex-col items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200/70 transition-colors hover:bg-white hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition-colors group-hover:bg-brand-gradient group-hover:text-white group-hover:ring-transparent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{a.label}</span>
                </motion.button>
              )
            })}
          </div>
        </Panel>
      </motion.div>

      {activeSeasonName && (
        <p className="text-center text-xs text-slate-400">
          Datos de la temporada activa: <span className="font-semibold text-slate-500">{activeSeasonName}</span> · Hola, {username}
        </p>
      )}
    </div>
  )
}
