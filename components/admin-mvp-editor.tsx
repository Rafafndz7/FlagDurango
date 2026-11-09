"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2, RefreshCw, Search, Star, Trash2, Trophy, X } from "lucide-react"
import { getCategoryColor, getCategoryLabel } from "@/lib/categories"
import { MVP_WEIGHTS } from "@/lib/mvp-suggestions"

interface Candidate {
  player_id: number
  name: string
  jersey_number: number | null
  team_name: string
  score: number
  detail: string
  games?: number
}

interface CurrentMvp {
  id: number
  player_id: number
  name: string
  jersey_number: number | null
  team_name: string
  notes: string | null
}

interface GameInfo {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  jornada: number | null
  category: string | null
  status: string | null
}

interface WeekSlot {
  jornada: number
  category: string
  candidates: Candidate[]
  mvp: CurrentMvp | null
}

interface GameSlot {
  game: GameInfo
  candidates: Candidate[]
  mvp: CurrentMvp | null
}

interface RosterPlayer {
  id: number
  name: string
  jersey_number: number | null
  team_name: string
}

type Selected = { kind: "weekly"; category: string; jornada: number } | { kind: "game"; game_id: number }

const RANK_STYLES = ["bg-yellow-500 text-white", "bg-gray-400 text-white", "bg-amber-700 text-white"]

const playerLabel = (p: { name: string; jersey_number: number | null }) =>
  `${p.jersey_number != null ? `#${p.jersey_number} ` : ""}${p.name}`

const scoreLine = (g: GameInfo) =>
  `${g.home_team} ${g.home_score ?? "-"} – ${g.away_score ?? "-"} ${g.away_team}`

function SlotPanel({
  selected,
  title,
  subtitle,
  candidates,
  mvp,
  onDone,
  onError,
  onClose,
}: {
  selected: Selected
  title: string
  subtitle: string
  candidates: Candidate[]
  mvp: CurrentMvp | null
  onDone: (message: string) => void
  onError: (message: string) => void
  onClose: () => void
}) {
  const [choice, setChoice] = useState<RosterPlayer | null>(
    mvp ? { id: mvp.player_id, name: mvp.name, jersey_number: mvp.jersey_number, team_name: mvp.team_name } : null,
  )
  const [notes, setNotes] = useState(mvp?.notes || "")
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const rosterUrl =
    selected.kind === "game"
      ? `/api/admin/mvps?roster_game=${selected.game_id}`
      : `/api/admin/mvps?roster_category=${encodeURIComponent(selected.category)}`

  useEffect(() => {
    let cancelled = false
    fetch(rosterUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRoster(data.success ? data.players : [])
      })
      .catch(() => !cancelled && setRoster([]))
    return () => {
      cancelled = true
    }
  }, [rosterUrl])

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (roster || []).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q) || String(p.jersey_number ?? "") === q,
    )
  }, [roster, search])

  const changed = choice && (choice.id !== mvp?.player_id || notes.trim() !== (mvp?.notes || "").trim())

  const save = async () => {
    if (!choice) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/mvps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          player_id: choice.id,
          notes: choice.id === mvp?.player_id ? notes : notes === (mvp?.notes || "") ? "" : notes,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "No se pudo guardar")
      onDone(`${choice.name}: ${title}`)
    } catch (e: any) {
      onError(e.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!mvp || !confirm(`¿Quitar a ${mvp.name}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/mvps?id=${mvp.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "No se pudo quitar")
      onDone(`Se quitó a ${mvp.name} (${title})`)
    } catch (e: any) {
      onError(e.message)
      setSaving(false)
    }
  }

  const pick = (p: RosterPlayer) => setChoice(p)

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base text-gray-900">{title}</CardTitle>
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-lg border p-3 ${choice ? "border-green-300 bg-green-50" : "border-dashed border-gray-300"}`}>
          <p className="text-xs font-semibold uppercase text-gray-500">{choice && choice.id !== mvp?.player_id ? "Nuevo" : "Actual"}</p>
          {choice ? (
            <p className="font-semibold text-gray-900">
              {playerLabel(choice)} <span className="font-normal text-gray-600">· {choice.team_name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500">Sin asignar. Elige un sugerido o búscalo en el roster.</p>
          )}
          {mvp && choice && choice.id !== mvp.player_id && (
            <p className="mt-1 text-xs text-gray-500">Reemplaza a {playerLabel(mvp)}</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Sugeridos por estadísticas</p>
          {candidates.length === 0 ? (
            <p className="text-xs text-gray-500">Este partido no tiene estadísticas capturadas.</p>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((c, i) => (
                <button
                  key={c.player_id}
                  type="button"
                  onClick={() => pick({ id: c.player_id, name: c.name, jersey_number: c.jersey_number, team_name: c.team_name })}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left transition hover:bg-gray-50 ${
                    choice?.id === c.player_id ? "border-green-400 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[i] || "bg-gray-200"}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{playerLabel(c)}</span>
                    <span className="block truncate text-xs text-gray-600">
                      {c.team_name}
                      {c.games && c.games > 1 ? ` · ${c.games} partidos` : ""}
                      {c.detail ? ` · ${c.detail}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-gray-900">{c.score} pts</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Cualquier jugador</p>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input className="pl-8" placeholder="Nombre, equipo o número…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1">
            {roster == null ? (
              <p className="flex items-center gap-2 p-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando roster…
              </p>
            ) : filteredRoster.length === 0 ? (
              <p className="p-2 text-xs text-gray-500">Sin jugadores.</p>
            ) : (
              filteredRoster.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 ${
                    choice?.id === p.id ? "bg-green-100" : ""
                  }`}
                >
                  <span className="truncate text-gray-900">{playerLabel(p)}</span>
                  <span className="shrink-0 truncate text-xs text-gray-500">{p.team_name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-gray-900">Nota</p>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Se llena sola si la dejas vacía" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={!changed || saving} className="flex-1">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Guardar
          </Button>
          {mvp && (
            <Button variant="outline" onClick={remove} disabled={saving} className="text-red-600">
              <Trash2 className="mr-1 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SlotButton({
  active,
  icon,
  title,
  mvp,
  hint,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  title: string
  mvp: CurrentMvp | null
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition hover:bg-gray-50 ${
        active ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">{title}</span>
        {mvp ? (
          <span className="block truncate text-xs text-green-700">
            ★ {playerLabel(mvp)} · {mvp.team_name}
          </span>
        ) : (
          <span className="block truncate text-xs text-gray-500">Sin asignar{hint ? ` · sugerido: ${hint}` : ""}</span>
        )}
      </span>
      {mvp ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : null}
    </button>
  )
}

export default function AdminMvpEditor() {
  const [weeks, setWeeks] = useState<WeekSlot[]>([])
  const [games, setGames] = useState<GameSlot[]>([])
  const [jornadas, setJornadas] = useState<number[]>([])
  const [jornada, setJornada] = useState<number | null>(null)
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/mvps", { cache: "no-store" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Error cargando MVPs")
      setWeeks(data.weeks || [])
      setGames(data.games || [])
      setJornadas(data.jornadas || [])
      setJornada((current) => current ?? data.current_jornada ?? data.jornadas?.[0] ?? null)
      setVersion((v) => v + 1)
    } catch (e: any) {
      setNotice({ type: "error", text: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const categories = useMemo(
    () => Array.from(new Set(weeks.filter((w) => w.jornada === jornada).map((w) => w.category))).sort(),
    [weeks, jornada],
  )
  const visibleCategories = category === "all" ? categories : categories.filter((c) => c === category)

  const selectedWeek =
    selected?.kind === "weekly" ? weeks.find((w) => w.category === selected.category && w.jornada === selected.jornada) : undefined
  const selectedGame = selected?.kind === "game" ? games.find((g) => g.game.id === selected.game_id) : undefined

  const done = async (text: string) => {
    setNotice({ type: "ok", text })
    await load()
  }

  const isActive = (s: Selected) =>
    !!selected &&
    selected.kind === s.kind &&
    (s.kind === "game"
      ? selected.kind === "game" && selected.game_id === s.game_id
      : selected.kind === "weekly" && selected.category === s.category && selected.jornada === s.jornada)

  const assignedCount = (list: { mvp: CurrentMvp | null }[]) => list.filter((s) => s.mvp).length

  return (
    <div className="space-y-4">
      {notice && (
        <div
          className={`sticky top-2 z-30 flex items-center gap-2 rounded-lg p-3 text-sm shadow ${
            notice.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="border border-gray-200 bg-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Star className="h-5 w-5 text-yellow-500" />
              Editar MVPs
            </CardTitle>
            <p className="mt-1 max-w-2xl text-xs text-gray-500">
              Pica el jugador de la semana o un partido para asignar, cambiar o quitar al MVP. Sugeridos: TD {MVP_WEIGHTS.td_anotado} · TD
              pase {MVP_WEIGHTS.td_pase} · INT {MVP_WEIGHTS.intercepcion} · Sack {MVP_WEIGHTS.sack} · Pase defendido{" "}
              {MVP_WEIGHTS.pase_defendido} · Pase completo, recepción y bandera {MVP_WEIGHTS.pase_completo} · +{MVP_WEIGHTS.victoria} si
              ganó
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded border px-2 text-sm"
              value={jornada ?? ""}
              onChange={(e) => {
                setJornada(Number(e.target.value))
                setSelected(null)
              }}
            >
              {jornadas.map((j) => (
                <option key={j} value={j}>
                  Jornada {j}
                </option>
              ))}
            </select>
            <select className="h-9 rounded border px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryLabel(c)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading && weeks.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando MVPs…
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            {visibleCategories.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">No hay partidos en esta jornada.</p>
            )}
            {visibleCategories.map((cat) => {
              const week = weeks.find((w) => w.category === cat && w.jornada === jornada)
              const catGames = games.filter((g) => g.game.category === cat && g.game.jornada === jornada)
              return (
                <Card key={cat} className="border border-gray-200 bg-white">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                    <Badge className={`${getCategoryColor(cat)} text-white`}>{getCategoryLabel(cat)}</Badge>
                    <span className="text-xs text-gray-500">
                      {assignedCount(catGames)}/{catGames.length} partidos con MVP
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {week && (
                      <SlotButton
                        active={isActive({ kind: "weekly", category: cat, jornada: week.jornada })}
                        icon={<Trophy className="h-5 w-5 text-yellow-600" />}
                        title={`Jugador de la semana · J${week.jornada}`}
                        mvp={week.mvp}
                        hint={week.candidates[0] ? `${week.candidates[0].name} (${week.candidates[0].score} pts)` : undefined}
                        onClick={() => setSelected({ kind: "weekly", category: cat, jornada: week.jornada })}
                      />
                    )}
                    {catGames.map(({ game, mvp, candidates }) => (
                      <SlotButton
                        key={game.id}
                        active={isActive({ kind: "game", game_id: game.id })}
                        icon={<Star className="h-5 w-5 text-green-600" />}
                        title={scoreLine(game)}
                        mvp={mvp}
                        hint={candidates[0] ? `${candidates[0].name} (${candidates[0].score} pts)` : undefined}
                        onClick={() => setSelected({ kind: "game", game_id: game.id })}
                      />
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="lg:sticky lg:top-4">
            {selectedWeek ? (
              <SlotPanel
                key={`w-${selectedWeek.category}-${selectedWeek.jornada}-${version}`}
                selected={{ kind: "weekly", category: selectedWeek.category, jornada: selectedWeek.jornada }}
                title={`Jugador de la semana J${selectedWeek.jornada}`}
                subtitle={getCategoryLabel(selectedWeek.category)}
                candidates={selectedWeek.candidates}
                mvp={selectedWeek.mvp}
                onDone={done}
                onError={(text) => setNotice({ type: "error", text })}
                onClose={() => setSelected(null)}
              />
            ) : selectedGame ? (
              <SlotPanel
                key={`g-${selectedGame.game.id}-${version}`}
                selected={{ kind: "game", game_id: selectedGame.game.id }}
                title="MVP del partido"
                subtitle={`${scoreLine(selectedGame.game)} · ${getCategoryLabel(selectedGame.game.category)} · J${selectedGame.game.jornada}`}
                candidates={selectedGame.candidates}
                mvp={selectedGame.mvp}
                onDone={done}
                onError={(text) => setNotice({ type: "error", text })}
                onClose={() => setSelected(null)}
              />
            ) : (
              <Card className="border border-dashed border-gray-300 bg-white">
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  Pica el jugador de la semana o un partido para editar su MVP.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
