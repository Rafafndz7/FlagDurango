"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"
import { formatGameTime } from "@/lib/game-date"

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string | null
  game_time: string | null
  field: string | null
  venue: string | null
  category: string | null
  jornada: number | string | null
  match_type?: string | null
  game_type?: string | null
  referee1?: string | null
  referee2?: string | null
}

interface Team {
  name: string
  logo_url?: string | null
  color1?: string | null
  color2?: string | null
}

const box = "inline-block h-[18px] w-[18px] shrink-0 border-2 border-black align-middle"

function TeamLogo({ team, name }: { team?: Team; name: string }) {
  if (team?.logo_url) {
    return <img src={team.logo_url} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: team?.color1 || "#334155" }}
    >
      {initials}
    </span>
  )
}

function TeamRow({ name, team }: { name: string; team?: Team }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1.55fr)] border-t border-black">
      <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
        <TeamLogo team={team} name={name} />
        <span className="truncate text-[13px] font-bold leading-tight">{name.trim()}</span>
      </div>
      <div className="flex items-center justify-center border-l border-black px-2">
        <span className="h-9 w-full border-2 border-black" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l border-black px-2 py-1 text-[11px]">
        <span className="flex items-center gap-1">
          <span className={box} /> Efectivo
        </span>
        <span className="flex items-center gap-1">
          <span className={box} /> Transferencia
        </span>
        <span className="flex items-end gap-1">
          Abonó <span className="inline-block w-14 border-b border-black" />
        </span>
        <span className="flex items-end gap-1">
          Falta <span className="inline-block w-14 border-b border-black" />
        </span>
      </div>
    </div>
  )
}

function HojaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fecha = searchParams.get("fecha") || ""
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<"hora" | "campo">("hora")

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/games?include_drafts=1", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/teams", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([g, t]) => {
        if (!g.success) throw new Error(g.message || "No se pudieron cargar los partidos")
        setGames(g.data || [])
        setTeams(t.data || [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dates = useMemo(
    () => Array.from(new Set(games.map((g) => (g.game_date || "").slice(0, 10)).filter(Boolean))).sort().reverse(),
    [games],
  )

  useEffect(() => {
    if (!fecha && dates.length) {
      const today = new Date().toISOString().slice(0, 10)
      const next = dates.slice().reverse().find((d) => d >= today) || dates[0]
      router.replace(`/admin/hoja-arbitraje?fecha=${next}`)
    }
  }, [fecha, dates, router])

  const teamByName = useMemo(() => new Map(teams.map((t) => [t.name.trim(), t])), [teams])

  const dayGames = useMemo(() => {
    const list = games.filter((g) => (g.game_date || "").slice(0, 10) === fecha)
    const time = (g: Game) => String(g.game_time || "").slice(0, 5)
    const field = (g: Game) => String(g.field || "")
    return list.sort((a, b) =>
      order === "hora"
        ? time(a).localeCompare(time(b)) || field(a).localeCompare(field(b))
        : field(a).localeCompare(field(b)) || time(a).localeCompare(time(b)),
    )
  }, [games, fecha, order])

  const first = dayGames[0]
  const dateLabel = fecha
    ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @page { size: letter portrait; margin: 9mm; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3 shadow-sm print:hidden">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </button>
        <select
          value={fecha}
          onChange={(e) => router.replace(`/admin/hoja-arbitraje?fecha=${e.target.value}`)}
          className="h-9 rounded border px-2 text-sm"
        >
          {!dates.includes(fecha) && fecha && <option value={fecha}>{fecha}</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as "hora" | "campo")} className="h-9 rounded border px-2 text-sm">
          <option value="hora">Ordenar por hora</option>
          <option value="campo">Ordenar por campo</option>
        </select>
        <span className="text-sm text-slate-500">{dayGames.length} partidos</span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={dayGames.length === 0}
          className="ml-auto inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-[216mm] bg-white p-[9mm] text-black shadow print:max-w-none print:p-0 print:shadow-none">
        {loading ? (
          <p className="flex items-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : error ? (
          <p className="py-20 text-sm text-red-600">{error}</p>
        ) : dayGames.length === 0 ? (
          <p className="py-20 text-sm text-slate-500">No hay partidos el {fecha || "día elegido"}.</p>
        ) : (
          <>
            <header className="mb-3 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
              <div className="flex items-center gap-3">
                <img src="/images/logo-flag-durango.png" alt="" className="h-12 w-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
                <div>
                  <h1 className="text-xl font-extrabold uppercase leading-tight">Control de arbitraje y marcadores</h1>
                  <p className="text-sm capitalize">
                    {first?.jornada ? `Jornada ${first.jornada} · ` : ""}
                    {dateLabel}
                    {first?.venue ? ` · ${first.venue}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] leading-snug">
                <p>Efectivo: solo palomita ✓</p>
                <p>Transferencia: palomita</p>
                <p>Si abonó: anota abono y lo que falta</p>
              </div>
            </header>

            <div className="space-y-2.5">
              {dayGames.map((g) => {
                const friendly = g.match_type === "amistoso" || g.game_type === "friendly"
                return (
                  <section key={g.id} className="break-inside-avoid border-2 border-black">
                    <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 text-[12px]">
                      <span className="font-extrabold">{g.game_time ? formatGameTime(g.game_time) : "—"}</span>
                      <span>·</span>
                      <span className="font-bold">{g.field || "Sin campo"}</span>
                      <span>·</span>
                      <span>{getCategoryLabel(g.category)}</span>
                      {friendly && <span className="rounded border border-black px-1 text-[10px] font-bold uppercase">Amistoso</span>}
                      <span className="ml-auto text-[10px] text-slate-600">#{g.id}</span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1.55fr)] border-t border-black text-[10px] font-bold uppercase">
                      <span className="px-2 py-0.5">Equipo</span>
                      <span className="border-l border-black px-2 py-0.5 text-center">Marcador</span>
                      <span className="border-l border-black px-2 py-0.5">Arbitraje</span>
                    </div>
                    <TeamRow name={g.home_team} team={teamByName.get(g.home_team.trim())} />
                    <TeamRow name={g.away_team} team={teamByName.get(g.away_team.trim())} />
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-black px-2 py-1.5 text-[11px]">
                      <span className="flex items-center gap-1 font-semibold">
                        <span className={box} /> Estadísticas entregadas
                      </span>
                      <span className="flex flex-1 items-end gap-1">
                        Árbitros <span className="inline-block min-w-[120px] flex-1 border-b border-black" />
                      </span>
                      <span className="flex flex-1 items-end gap-1">
                        Observaciones <span className="inline-block min-w-[120px] flex-1 border-b border-black" />
                      </span>
                    </div>
                  </section>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function HojaArbitrajePage() {
  return (
    <Suspense fallback={null}>
      <HojaContent />
    </Suspense>
  )
}
