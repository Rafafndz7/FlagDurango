"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, Copy, Loader2, MessageCircle, Plus, Send, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCategoryLabel as baseCategoryLabel } from "@/lib/categories"
import { formatGameDate, localDateKey } from "@/lib/game-date"

export const DEFAULT_REGISTRATION_FEE = 1900

const getCategoryLabel = (category?: string | null) => {
  const label = baseCategoryLabel(category)
  return label === category
    ? String(category)
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : label
}

export type Installment = {
  id: number
  amount: number
  paid_at: string
  payment_method?: string | null
  held_by?: string | null
  note?: string | null
}

export type TeamFinanceInfo = {
  team_id: number
  finance_id: number | null
  fee: number
  paid_total: number
  status: "paid" | "partial" | "unpaid"
  notes: string | null
  installments: Installment[]
}

export type PayStatus = "paid" | "partial" | "unpaid"

export type PayInfo = {
  fee: number
  paidTotal: number
  remaining: number
  status: PayStatus
  installments: Installment[]
  notes: string | null
  hasFinance: boolean
}

export type PayTeam = {
  id?: any
  name: string
  category?: string
  paid?: boolean
  coach_name?: string
  coach_phone?: string
  captain_name?: string
  captain_phone?: string
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-MX")

export function resolvePayInfo(team: PayTeam, info?: TeamFinanceInfo): PayInfo {
  const fee = info?.fee ?? DEFAULT_REGISTRATION_FEE
  const paidTotal = info?.paid_total ?? 0
  const status: PayStatus = team.paid || info?.status === "paid" ? "paid" : paidTotal > 0 ? "partial" : "unpaid"
  return {
    fee,
    paidTotal,
    remaining: status === "paid" ? 0 : Math.max(fee - paidTotal, 0),
    status,
    installments: info?.installments ?? [],
    notes: info?.notes ?? null,
    hasFinance: Boolean(info?.finance_id),
  }
}

export function useTeamFinance(seasonIds: string[]) {
  const [finance, setFinance] = useState<Map<number, TeamFinanceInfo>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const key = seasonIds.join(",")

  const reload = useCallback(async (): Promise<Map<number, TeamFinanceInfo>> => {
    const ids = key ? key.split(",") : []
    if (ids.length === 0) return new Map()
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/team-finance?season=${encodeURIComponent(id)}`, { cache: "no-store" })
            .then((res) => res.json())
            .catch(() => ({ success: false })),
        ),
      )
      const next = new Map<number, TeamFinanceInfo>()
      let failed = false
      for (const res of results) {
        if (!res?.success) {
          failed = true
          continue
        }
        for (const row of res.data || []) {
          next.set(Number(row.team.id), {
            team_id: Number(row.team.id),
            finance_id: row.finance?.id ?? null,
            fee: Number(row.finance?.registration_fee ?? DEFAULT_REGISTRATION_FEE),
            paid_total: Number(row.paid_total || 0),
            status: row.finance?.status || "unpaid",
            notes: row.finance?.notes ?? null,
            installments: row.installments || [],
          })
        }
      }
      setFinance(next)
      setError(failed ? "No se pudieron cargar los abonos de algunas temporadas." : null)
      return next
    } catch {
      setError("No se pudieron cargar los abonos.")
      return new Map()
    }
  }, [key])

  useEffect(() => {
    reload()
  }, [reload])

  return { finance, error, reload }
}

export function teamPhone(team: PayTeam) {
  const raw = team.coach_phone || team.captain_phone || ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return "52" + digits
  if (digits.length >= 12) return digits
  return ""
}

export const waLink = (text: string, phone?: string) =>
  `https://wa.me/${phone || ""}?text=${encodeURIComponent(text)}`

export function reminderText(team: PayTeam, pay: PayInfo, seasonName?: string) {
  const contact = team.coach_name || team.captain_name
  const lines = [
    `Hola${contact ? " " + contact.split(" ")[0] : ""} 👋`,
    `Te recordamos que el equipo *${team.name}* tiene un saldo pendiente de inscripción${seasonName ? " de la temporada " + seasonName : ""}:`,
    "",
    `• Cuota: ${money(pay.fee)}`,
  ]
  if (pay.paidTotal > 0) lines.push(`• Abonado: ${money(pay.paidTotal)}`)
  lines.push(`• *Pendiente: ${money(pay.remaining)}*`, "", "¡Gracias! 🏈 Liga Flag Durango")
  return lines.join("\n")
}

function ModalShell({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ui-v2 fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={reduce ? false : { opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            <div className="brand-stripes h-1 w-full" aria-hidden />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  ajuste: "Ajuste",
  otro: "Otro",
}

export function TeamPaymentsDialog({
  team,
  pay,
  seasonName,
  notice,
  onClose,
  onChanged,
}: {
  team: PayTeam | null
  pay: PayInfo | null
  seasonName?: string
  notice?: string | null
  onClose: () => void
  onChanged: (teamId: number, paid: boolean | null) => Promise<void> | void
}) {
  const today = localDateKey(new Date())
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ amount: "", payment_method: "efectivo", held_by: "", note: "", paid_at: today })
  const [fee, setFee] = useState("")
  const [notes, setNotes] = useState("")

  const teamId = team ? Number(team.id) : null

  useEffect(() => {
    if (!team || !pay) return
    setForm((f) => ({ ...f, amount: "", note: "", paid_at: localDateKey(new Date()) }))
    setFee(String(pay.fee))
    setNotes(pay.notes || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const addInstallment = async (amountOverride?: number) => {
    if (!teamId) return
    const amount = amountOverride ?? Number(form.amount)
    if (!amount || amount <= 0) {
      alert("Escribe un monto válido")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/team-finance/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          amount,
          payment_method: form.payment_method,
          held_by: form.held_by,
          note: form.note,
          paid_at: form.paid_at,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo guardar el abono")
        return
      }
      setForm((f) => ({ ...f, amount: "", note: "" }))
      await onChanged(teamId, data.totals ? data.totals.status === "paid" : null)
    } catch {
      alert("Error de conexión al guardar el abono")
    } finally {
      setSaving(false)
    }
  }

  const deleteInstallment = async (id: number) => {
    if (!teamId || !confirm("¿Eliminar este abono?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/team-finance/installments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo eliminar")
        return
      }
      await onChanged(teamId, data.totals ? data.totals.status === "paid" : null)
    } catch {
      alert("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const saveFee = async () => {
    if (!teamId) return
    const value = Number(fee)
    if (!value || value <= 0) {
      alert("La cuota debe ser mayor a 0")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/team-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, registration_fee: value, notes: notes || null }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "No se pudo guardar")
        return
      }
      await onChanged(teamId, null)
    } catch {
      alert("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const open = Boolean(team && pay)
  const pct = pay && pay.fee > 0 ? Math.min(100, Math.round(((pay.status === "paid" ? pay.fee : pay.paidTotal) / pay.fee) * 100)) : 0
  const phone = team ? teamPhone(team) : ""

  return (
    <ModalShell open={open} onClose={onClose}>
      {team && pay && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Abonos de inscripción</p>
              <h3 className="text-xl font-bold text-slate-900">{team.name}</h3>
              <p className="text-xs text-slate-500">
                {getCategoryLabel(team.category)}
                {seasonName ? ` · ${seasonName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {notice && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">{notice}</p>}

          <div className="mt-4 rounded-2xl bg-brand-ink p-4 text-white">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Cuota</p>
                <p className="font-display text-2xl font-extrabold italic">{money(pay.fee)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Abonado</p>
                <p className="font-display text-2xl font-extrabold italic text-emerald-300">
                  {money(pay.status === "paid" && pay.paidTotal === 0 ? pay.fee : pay.paidTotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Falta</p>
                <p className={cn("font-display text-2xl font-extrabold italic", pay.remaining > 0 ? "text-amber-300" : "text-white")}>
                  {money(pay.remaining)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-brand-gradient"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {pay.remaining > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Registrar abono</p>
              <div className="flex flex-wrap gap-2">
                {[500, 1000].filter((v) => v < pay.remaining).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, amount: String(v) }))}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition",
                      form.amount === String(v) ? "bg-slate-900 text-white ring-slate-900" : "text-slate-700 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {money(v)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, amount: String(pay.remaining) }))}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition",
                    form.amount === String(pay.remaining)
                      ? "bg-emerald-500 text-white ring-emerald-500"
                      : "text-emerald-700 ring-emerald-200 hover:bg-emerald-50",
                  )}
                >
                  Todo lo que falta ({money(pay.remaining)})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Monto</span>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="500"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Método</span>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Quién tiene el dinero</span>
                  <input
                    value={form.held_by}
                    onChange={(e) => setForm((f) => ({ ...f, held_by: e.target.value }))}
                    placeholder="Ej. Rafa / Caja"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Fecha</span>
                  <input
                    type="date"
                    value={form.paid_at}
                    onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="col-span-2 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Nota (opcional)</span>
                  <input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ej. Primer abono"
                    className={inputClass}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => addInstallment()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-brand transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Guardar abono
              </button>
              {phone && (
                <a
                  href={waLink(reminderText(team, pay, seasonName), phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Mandar recordatorio por WhatsApp
                </a>
              )}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-slate-900">Historial</p>
            {pay.installments.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                {pay.status === "paid" ? "Marcado como pagado sin abonos registrados." : "Sin abonos registrados."}
              </p>
            ) : (
              <div className="space-y-2">
                {pay.installments.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {money(Number(inst.amount))}
                        <span className="ml-2 text-xs font-medium text-slate-500">
                          {METHOD_LABEL[inst.payment_method || ""] || inst.payment_method || "—"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatGameDate(inst.paid_at, { day: "numeric", month: "short", year: "numeric" })}
                        {inst.held_by ? ` · Tiene: ${inst.held_by}` : ""}
                        {inst.note ? ` · ${inst.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => deleteInstallment(inst.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 ring-1 ring-red-100 transition hover:bg-red-500 hover:text-white"
                      aria-label="Eliminar abono"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <details className="group mt-5 rounded-2xl ring-1 ring-slate-200">
            <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-600">
              Cuota y notas del equipo
            </summary>
            <div className="space-y-3 px-4 pb-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Cuota de inscripción</span>
                <input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Notas</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={saveFee}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Guardar cuota y notas
              </button>
            </div>
          </details>
        </div>
      )}
    </ModalShell>
  )
}

export type ReportRow = { team: PayTeam; pay: PayInfo }

export function buildReportText(rows: ReportRow[], seasonName?: string) {
  const byCategory = new Map<string, ReportRow[]>()
  rows.forEach((row) => {
    const key = row.team.category || "sin-categoria"
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(row)
  })
  const total = rows.reduce((sum, r) => sum + r.pay.remaining, 0)
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })

  const lines = [
    "*🏈 Liga Flag Durango — Pagos pendientes*",
    `${seasonName ? "Temporada " + seasonName + " · " : ""}Corte al ${today}`,
  ]
  Array.from(byCategory.entries())
    .sort(([a], [b]) => getCategoryLabel(a).localeCompare(getCategoryLabel(b)))
    .forEach(([category, list]) => {
      lines.push("", `*${getCategoryLabel(category === "sin-categoria" ? "" : category)}*`)
      list
        .sort((a, b) => a.team.name.localeCompare(b.team.name))
        .forEach(({ team, pay }) => {
          lines.push(
            pay.paidTotal > 0
              ? `• ${team.name} — abonó ${money(pay.paidTotal)}, debe *${money(pay.remaining)}*`
              : `• ${team.name} — debe *${money(pay.remaining)}*`,
          )
        })
    })
  lines.push("", `*Total por cobrar: ${money(total)}* (${rows.length} equipo${rows.length === 1 ? "" : "s"})`)
  return lines.join("\n")
}

export function WhatsAppReportDialog({
  open,
  rows,
  seasonName,
  onClose,
}: {
  open: boolean
  rows: ReportRow[]
  seasonName?: string
  onClose: () => void
}) {
  const generated = useMemo(() => buildReportText(rows, seasonName), [rows, seasonName])
  const [text, setText] = useState(generated)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) setText(generated)
  }, [open, generated])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement("textarea")
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand("copy")
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const total = rows.reduce((sum, r) => sum + r.pay.remaining, 0)

  return (
    <ModalShell open={open} onClose={onClose} wide>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reporte para WhatsApp</p>
            <h3 className="text-xl font-bold text-slate-900">Equipos con pago pendiente</h3>
            <p className="text-xs text-slate-500">
              {rows.length} equipo{rows.length === 1 ? "" : "s"} · {money(total)} por cobrar
              {seasonName ? ` · ${seasonName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-8 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-800">¡Todos los equipos están al corriente!</p>
          </div>
        ) : (
          <>
            <p className="mt-5 mb-1.5 text-xs font-semibold text-slate-600">Mensaje para el grupo (lo puedes editar)</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copy}
                className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "¡Copiado!" : "Copiar mensaje"}
              </button>
              <a
                href={waLink(text)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-sm font-bold text-white transition hover:brightness-95"
              >
                <Send className="h-4 w-4" />
                Abrir en WhatsApp
              </a>
            </div>

            <p className="mt-6 mb-2 text-sm font-semibold text-slate-900">Recordatorio individual</p>
            <div className="space-y-2">
              {rows
                .slice()
                .sort((a, b) => b.pay.remaining - a.pay.remaining)
                .map(({ team, pay }) => {
                  const phone = teamPhone(team)
                  return (
                    <div key={team.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{team.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          Debe {money(pay.remaining)}
                          {pay.paidTotal > 0 ? ` · abonó ${money(pay.paidTotal)}` : ""}
                          {team.coach_name || team.captain_name ? ` · ${team.coach_name || team.captain_name}` : ""}
                        </p>
                      </div>
                      {phone ? (
                        <a
                          href={waLink(reminderText(team, pay, seasonName), phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-95"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Enviar
                        </a>
                      ) : (
                        <span className="shrink-0 text-[11px] font-medium text-slate-400">Sin teléfono</span>
                      )}
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}