"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, CheckCircle2, CircleDollarSign, Clock, Edit, Loader2, MessageCircle, Search, Trash2, Users, Wallet, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamAvatar } from "@/components/ui-v2/team-avatar"
import { EASE_OUT } from "@/components/ui-v2/motion"
import {
  TeamPaymentsDialog,
  WhatsAppReportDialog,
  money,
  resolvePayInfo,
  useTeamFinance,
  type PayStatus,
} from "@/components/admin-v2/team-payments"

export type BoardTeam = {
  id?: any
  name: string
  category?: string
  logo_url?: string
  color1?: string
  color2?: string
  paid?: boolean
  season_id?: string
  seasons?: { id: string; name: string } | null
  coach_name?: string
  coach_phone?: string
  coach_id?: number | null
  captain_name?: string
  captain_phone?: string
  stats?: { points: number; wins: number; losses: number; draws: number }
}

type BoardSeason = { id: string; name: string; is_active?: boolean }

type Props = {
  teams: BoardTeam[]
  seasons: BoardSeason[]
  activeSeasonId: string
  editingTeamId: number | null
  renderEditor: (team: BoardTeam) => ReactNode
  onEdit: (team: BoardTeam) => void
  onDelete: (id: number) => void
  onSetPaid: (ids: number[], paid: boolean) => Promise<void>
  onLocalPaid: (ids: number[], paid: boolean) => void
  actions?: ReactNode
  panel?: ReactNode
}

type PayFilter = "all" | PayStatus

const categoryLabel = (c?: string) =>
  String(c || "Sin categoría")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

export function AdminTeamsBoard({
  teams,
  seasons,
  activeSeasonId,
  editingTeamId,
  renderEditor,
  onEdit,
  onDelete,
  onSetPaid,
  onLocalPaid,
  actions,
  panel,
}: Props) {
  const reduce = useReducedMotion()
  const [seasonFilter, setSeasonFilter] = useState<string>("active")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [payFilter, setPayFilter] = useState<PayFilter>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [dialogTeamId, setDialogTeamId] = useState<number | null>(null)
  const [dialogNotice, setDialogNotice] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const seasonIds = useMemo(() => seasons.map((s) => s.id), [seasons])
  const { finance, error: financeError, reload: reloadFinance } = useTeamFinance(seasonIds)
  const payOf = (team: BoardTeam) => resolvePayInfo(team, finance.get(Number(team.id)))

  const resolvedSeasonId = seasonFilter === "active" ? activeSeasonId : seasonFilter === "all" ? "" : seasonFilter

  const seasonTeams = useMemo(
    () => (resolvedSeasonId ? teams.filter((t) => t.season_id === resolvedSeasonId) : teams),
    [teams, resolvedSeasonId],
  )

  const categories = useMemo(
    () => Array.from(new Set(seasonTeams.map((t) => t.category).filter(Boolean) as string[])).sort(),
    [seasonTeams],
  )

  const visibleTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    return seasonTeams.filter((t) => {
      if (categoryFilter && t.category !== categoryFilter) return false
      if (payFilter !== "all" && resolvePayInfo(t, finance.get(Number(t.id))).status !== payFilter) return false
      if (q && !`${t.name} ${t.coach_name || ""} ${t.captain_name || ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [seasonTeams, categoryFilter, payFilter, search, finance])

  useEffect(() => {
    setSelected(new Set())
  }, [seasonFilter, categoryFilter, payFilter, search])

  const seasonPays = seasonTeams.map((t) => payOf(t))
  const paidCount = seasonPays.filter((p) => p.status === "paid").length
  const partialCount = seasonPays.filter((p) => p.status === "partial").length
  const unpaidCount = seasonPays.filter((p) => p.status === "unpaid").length
  const collected = seasonPays.reduce((sum, p) => sum + (p.status === "paid" ? p.fee : p.paidTotal), 0)
  const owed = seasonPays.reduce((sum, p) => sum + p.remaining, 0)
  const paidPct = collected + owed > 0 ? Math.round((collected / (collected + owed)) * 100) : 0

  const reportRows = seasonTeams
    .filter((t) => !categoryFilter || t.category === categoryFilter)
    .map((team) => ({ team, pay: payOf(team) }))
    .filter((row) => row.pay.status !== "paid")
  const reportSeasonName = resolvedSeasonId ? seasons.find((s) => s.id === resolvedSeasonId)?.name : undefined

  const dialogTeam = dialogTeamId != null ? teams.find((t) => Number(t.id) === dialogTeamId) || null : null
  const openPayments = (team: BoardTeam, notice?: string) => {
    setDialogNotice(notice || null)
    setDialogTeamId(Number(team.id))
  }

  const handleFinanceChanged = async (teamId: number, paid: boolean | null) => {
    const next = await reloadFinance()
    const info = next.get(teamId)
    const finalPaid = paid ?? (info?.finance_id ? info.status === "paid" : null)
    if (finalPaid !== null) onLocalPaid([teamId], finalPaid)
    setDialogNotice(null)
  }

  const visibleIds = visibleTeams.map((t) => Number(t.id))
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const toggleSelect = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleIds))

  const runPaid = async (requested: number[], paid: boolean) => {
    let ids = requested
    if (!paid) {
      const withInstallments = ids.filter((id) => (finance.get(id)?.paid_total ?? 0) > 0)
      if (withInstallments.length) {
        ids = ids.filter((id) => !withInstallments.includes(id))
        if (requested.length === 1) {
          const team = teams.find((t) => Number(t.id) === requested[0])
          if (team) openPayments(team, "Este equipo tiene abonos registrados. Para dejarlo pendiente, elimina los abonos del historial.")
          return
        }
        alert(`${withInstallments.length} equipo(s) tienen abonos registrados y no se cambiaron. Elimina sus abonos desde el botón de abonos.`)
      }
    }
    if (!ids.length) return
    setPending((cur) => new Set([...Array.from(cur), ...ids]))
    try {
      await onSetPaid(ids, paid)
      await reloadFinance()
    } finally {
      setPending((cur) => {
        const next = new Set(cur)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  const bulkPaid = async (paid: boolean) => {
    const ids = Array.from(selected)
    await runPaid(ids, paid)
    setSelected(new Set())
  }

  const activeSeason = seasons.find((s) => s.id === activeSeasonId)
  const seasonChips: { id: string; label: string }[] = [
    ...(activeSeasonId ? [{ id: "active", label: `${activeSeason?.name || "Activa"} · activa` }] : []),
    ...seasons.filter((s) => s.id !== activeSeasonId).map((s) => ({ id: s.id, label: s.name })),
    { id: "all", label: "Todas" },
  ]

  return (
    <div className="ui-v2 space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Temporada</p>
            <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {seasonChips.map((chip) => {
                const active = seasonFilter === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSeasonFilter(chip.id)}
                    className={cn(
                      "relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active ? "text-white" : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="teams-season-pill"
                        className="absolute inset-0 -z-0 rounded-full bg-brand-ink"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{chip.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" />
              Reporte de pendientes
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatTile label="Equipos" value={seasonTeams.length} icon={<Users className="h-4 w-4" />} tone="ink" />
          <StatTile
            label="Pagados"
            value={paidCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="green"
            active={payFilter === "paid"}
            onClick={() => setPayFilter(payFilter === "paid" ? "all" : "paid")}
          />
          <StatTile
            label="Abonados"
            value={partialCount}
            icon={<Wallet className="h-4 w-4" />}
            tone="blue"
            active={payFilter === "partial"}
            onClick={() => setPayFilter(payFilter === "partial" ? "all" : "partial")}
          />
          <StatTile
            label="Pendientes"
            value={unpaidCount}
            icon={<Clock className="h-4 w-4" />}
            tone="amber"
            active={payFilter === "unpaid"}
            onClick={() => setPayFilter(payFilter === "unpaid" ? "all" : "unpaid")}
          />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
              <CircleDollarSign className="h-3.5 w-3.5" />
              Cobrado <strong className="text-slate-900">{money(collected)}</strong>
              <span className="text-slate-300">·</span>
              Por cobrar <strong className="text-amber-600">{money(owed)}</strong>
            </span>
            <span className="font-bold text-slate-900">{paidPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-brand-gradient"
              initial={false}
              animate={{ width: `${paidPct}%` }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipo, coach o capitán…"
              className="h-10 w-full rounded-full bg-slate-100 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <div className="flex rounded-full bg-slate-100 p-1">
            {(
              [
                ["all", "Todos"],
                ["paid", "Pagados"],
                ["partial", "Abonados"],
                ["unpaid", "Pendientes"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPayFilter(value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  payFilter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {financeError && (
        <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">{financeError}</p>
      )}

      {panel}

      <div className="flex items-center justify-between px-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 accent-[#0857b5]"
          />
          Seleccionar {visibleTeams.length} equipos
        </label>
        <span className="hidden text-xs text-slate-400 sm:inline">Toca “Pagado” para cambiarlo al instante</span>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-ink p-3 text-white shadow-[0_18px_40px_-20px_rgba(8,87,181,0.7)]"
          >
            <span className="px-2 text-sm font-semibold">{selected.size} seleccionados</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bulkPaid(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-400"
              >
                <Check className="h-3.5 w-3.5" />
                Marcar pagados
              </button>
              <button
                type="button"
                onClick={() => bulkPaid(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <Clock className="h-3.5 w-3.5" />
                Marcar pendientes
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Limpiar selección"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {visibleTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
          <Users className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No hay equipos con estos filtros</p>
          <p className="mt-1 text-xs text-slate-500">Prueba otra temporada o categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleTeams.map((team) => {
            const id = Number(team.id)
            const isEditing = editingTeamId === id
            const isPending = pending.has(id)
            const isSelected = selected.has(id)
            const pay = payOf(team)

            if (isEditing) {
              return (
                <div
                  key={team.id}
                  className="col-span-full rounded-3xl bg-white p-5 shadow-lg ring-2 ring-brand-blue/30"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <TeamAvatar name={team.name} logoUrl={team.logo_url} color1={team.color1} color2={team.color2} size="sm" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Editando equipo</p>
                      <p className="font-bold text-slate-900">{team.name}</p>
                    </div>
                  </div>
                  {renderEditor(team)}
                </div>
              )
            }

            return (
              <motion.div
                key={team.id}
                layout={!reduce}
                className={cn(
                  "group relative flex flex-col rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition-shadow hover:shadow-lg",
                  isSelected ? "ring-2 ring-brand-blue/50" : "ring-slate-200/60",
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#0857b5]"
                    aria-label={`Seleccionar ${team.name}`}
                  />
                  <TeamAvatar name={team.name} logoUrl={team.logo_url} color1={team.color1} color2={team.color2} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-900">{team.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {categoryLabel(team.category)}
                      </span>
                      {team.seasons?.name && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {team.seasons.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {team.stats && (
                    <div className="shrink-0 text-right">
                      <div className="font-display text-xl font-extrabold italic leading-none text-slate-900">
                        {team.stats.points}
                        <span className="ml-0.5 text-xs font-semibold not-italic text-slate-400">pts</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {team.stats.wins}G-{team.stats.losses}P-{team.stats.draws}E
                      </div>
                    </div>
                  )}
                </div>

                {(team.coach_name || team.captain_name) && (
                  <div className="mt-3 space-y-0.5 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {team.coach_name && (
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Coach:</span> {team.coach_name}
                        {team.coach_phone ? ` · ${team.coach_phone}` : ""}
                      </div>
                    )}
                    {team.captain_name && (
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Capitán:</span> {team.captain_name}
                        {team.captain_phone ? ` · ${team.captain_phone}` : ""}
                      </div>
                    )}
                  </div>
                )}

                {pay.status !== "paid" && (
                  <button
                    type="button"
                    onClick={() => openPayments(team)}
                    className="mt-3 block w-full rounded-2xl px-3 py-2 text-left ring-1 ring-slate-200/70 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {pay.paidTotal > 0 ? (
                          <>
                            Abonado <strong className="text-slate-800">{money(pay.paidTotal)}</strong> de {money(pay.fee)}
                          </>
                        ) : (
                          <>Cuota {money(pay.fee)}</>
                        )}
                      </span>
                      <span className="font-bold text-amber-600">Faltan {money(pay.remaining)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-gradient transition-all"
                        style={{ width: `${pay.fee > 0 ? Math.min(100, (pay.paidTotal / pay.fee) * 100) : 0}%` }}
                      />
                    </div>
                  </button>
                )}

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runPaid([id], pay.status !== "paid")}
                    className={cn(
                      "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition",
                      pay.status === "paid"
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : pay.status === "partial"
                          ? "bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20 hover:bg-brand-blue/15"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100",
                      isPending && "cursor-wait opacity-70",
                    )}
                    title={pay.status === "paid" ? "Marcar como pendiente" : "Marcar como pagado completo"}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : pay.status === "paid" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {pay.status === "paid" ? "Pagado" : pay.status === "partial" ? "Abonado · marcar pagado" : "Pendiente · marcar pagado"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPayments(team)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-blue ring-1 ring-brand-blue/20 transition hover:bg-brand-blue hover:text-white hover:ring-brand-blue"
                    aria-label={`Abonos de ${team.name}`}
                    title="Abonos / pagos parciales"
                  >
                    <Wallet className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(team)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-900 hover:text-white hover:ring-slate-900"
                    aria-label={`Editar ${team.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 ring-1 ring-red-100 transition hover:bg-red-500 hover:text-white hover:ring-red-500"
                    aria-label={`Eliminar ${team.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <TeamPaymentsDialog
        team={dialogTeam}
        pay={dialogTeam ? payOf(dialogTeam) : null}
        seasonName={dialogTeam?.seasons?.name}
        notice={dialogNotice}
        onClose={() => {
          setDialogTeamId(null)
          setDialogNotice(null)
        }}
        onChanged={handleFinanceChanged}
      />
      <WhatsAppReportDialog
        open={reportOpen}
        rows={reportRows}
        seasonName={reportSeasonName}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
}

function StatTile({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: ReactNode
  tone: "ink" | "green" | "blue" | "amber"
  active?: boolean
  onClick?: () => void
}) {
  const tones = {
    ink: "bg-brand-ink text-white",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-brand-blue/10 text-brand-blue",
    amber: "bg-amber-50 text-amber-700",
  }
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex flex-col-reverse items-start gap-1 rounded-2xl px-3 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between sm:px-4",
        tones[tone],
        onClick && "hover:brightness-95",
        active && "ring-2 ring-offset-2 ring-current",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold sm:gap-2 sm:text-sm">
        {icon}
        {label}
      </span>
      <span className="font-display text-2xl font-extrabold italic leading-none sm:text-3xl">{value}</span>
    </Comp>
  )
}
