"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  ImageIcon,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  Upload,
  X,
} from "lucide-react"
import { blobToBase64, compressImage } from "@/lib/image-compress"
import { cn } from "@/lib/utils"
import { getCategoryLabel as baseCategoryLabel } from "@/lib/categories"
import { dateKey } from "@/lib/game-date"
import {
  buildRolSql,
  compactKey,
  gridFromImageResult,
  isDarkColor,
  parseRolGrid,
  resolveRolGames,
  type LearnedAliases,
  type RolGrid,
  type RolTeam,
} from "@/lib/rol-import"

type ImporterTeam = RolTeam & { season_id?: string | null }
type ImporterGame = { id: number | string; jornada?: number | string | null; game_date?: string | null; season_id?: string | null; status?: string }

type Props = {
  teams: ImporterTeam[]
  games: ImporterGame[]
  activeSeasonId: string
  seasonYear?: number
  onImported?: () => void
}

type Sheet = { name: string; grid: RolGrid }

const LEARNED_KEY = "rol-import-aliases-v1"
const LOCKED_STATUSES = new Set(["en vivo", "en_vivo", "finalizado"])

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"

const getCategoryLabel = (category?: string | null) => {
  if (!category) return "Sin categoría"
  const label = baseCategoryLabel(category)
  return label === category
    ? category
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : label
}

const cssColorToHex = (value: string | null | undefined): string | null => {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (!v || v === "transparent" || v === "inherit" || v === "initial") return null
  let hex: string | null = null
  if (v.startsWith("#")) {
    hex = v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v.slice(0, 7)
  } else {
    const m = v.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const [r, g, b, a] = m[1].split(",").map((p) => parseFloat(p.trim()))
      if (a === 0) return null
      hex = `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`
    }
  }
  return hex === "#ffffff" ? null : hex
}

/** Tabla pegada desde Google Sheets / Excel (HTML con colores) o texto separado por tabs */
function gridFromClipboard(data: DataTransfer): RolGrid | null {
  const html = data.getData("text/html")
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html")
    const table = doc.querySelector("table")
    if (table) {
      return Array.from(table.querySelectorAll("tr")).map((tr) => {
        const row: RolGrid[number] = []
        Array.from(tr.querySelectorAll("td, th")).forEach((cell) => {
          const el = cell as HTMLElement
          const text = (el.textContent || "").replace(/\s+/g, " ").trim()
          const color = cssColorToHex(el.style.backgroundColor || el.getAttribute("bgcolor"))
          row.push({ text, color })
          const span = Number(el.getAttribute("colspan") || 1)
          for (let i = 1; i < span; i++) row.push({ text: "", color })
        })
        return row
      })
    }
  }
  const text = data.getData("text/plain")
  if (!text.trim()) return null
  return text.split(/\r?\n/).map((line) => line.split("\t").map((t) => ({ text: t.trim(), color: null })))
}

const argbToHex = (argb?: string) => {
  if (!argb || argb.length < 6) return null
  const hex = `#${argb.slice(-6).toLowerCase()}`
  return hex === "#ffffff" ? null : hex
}

const excelCellText = (cell: any): string => {
  const value = cell?.value
  if (value == null) return ""
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`
  }
  if (typeof value === "number") {
    if (value > 0 && value < 1) {
      const minutes = Math.round(value * 24 * 60)
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
    }
    return String(value)
  }
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((p: any) => p.text).join("")
    if ("result" in value) return value.result == null ? "" : String(value.result)
    if ("text" in value) return String(value.text)
  }
  return String(value)
}

const excelCellColor = (cell: any): string | null => {
  const fill = cell?.fill
  if (!fill || fill.type !== "pattern" || fill.pattern === "none") return null
  const color = fill.fgColor || fill.bgColor
  if (!color) return null
  if (color.argb) return argbToHex(color.argb)
  if (color.theme != null) return `theme-${color.theme}-${color.tint ?? 0}`
  return null
}

async function readWorkbook(file: File): Promise<Sheet[]> {
  const ExcelJS: any = (await import("exceljs")).default ?? (await import("exceljs"))
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheets: Sheet[] = []
  workbook.eachSheet((ws: any) => {
    const grid: RolGrid = []
    for (let r = 1; r <= ws.rowCount; r++) {
      const row: RolGrid[number] = []
      for (let c = 1; c <= ws.columnCount; c++) {
        const cell = ws.getCell(r, c)
        const master = cell.isMerged && cell.master && cell.master.address !== cell.address
        row.push({ text: master ? "" : excelCellText(cell).replace(/\s+/g, " ").trim(), color: excelCellColor(cell) })
      }
      grid.push(row)
    }
    sheets.push({ name: ws.name, grid })
  })
  return sheets
}

const sheetJornada = (sheet: Sheet) => {
  for (const row of sheet.grid) for (const cell of row) {
    const m = cell.text.match(/jornada\s*(\d+)/i)
    if (m) return Number(m[1])
  }
  return -1
}

const loadLearned = (): LearnedAliases => {
  try {
    return JSON.parse(localStorage.getItem(LEARNED_KEY) || "{}")
  } catch {
    return {}
  }
}

export function RolImporter({ teams, games, activeSeasonId, seasonYear, onImported }: Props) {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [sourceLabel, setSourceLabel] = useState("")
  const [sheetIndex, setSheetIndex] = useState(0)
  const [readError, setReadError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [meta, setMeta] = useState({ jornada: "", date: "", venue: "" })
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [teamOverrides, setTeamOverrides] = useState<Record<string, { home?: string; away?: string }>>({})
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [friendlyOverrides, setFriendlyOverrides] = useState<Record<string, boolean>>({})
  const [aiNotes, setAiNotes] = useState<string[]>([])
  const [sql, setSql] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [learned, setLearned] = useState<LearnedAliases>({})
  const [isDraft, setIsDraft] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  const year = seasonYear || new Date().getFullYear()
  const seasonTeams = useMemo(
    () => teams.filter((t) => !activeSeasonId || t.season_id === activeSeasonId),
    [teams, activeSeasonId],
  )

  useEffect(() => {
    setLearned(loadLearned())
  }, [])

  const grid = sheets[sheetIndex]?.grid
  const parsed = useMemo(() => (grid ? parseRolGrid(grid, year) : null), [grid, year])

  useEffect(() => {
    if (!parsed) return
    setMeta({ jornada: parsed.jornada ? String(parsed.jornada) : "", date: parsed.date || "", venue: parsed.venue })
    setColorOverrides({})
    setCategoryOverrides({})
    setTeamOverrides({})
    setExcluded(new Set())
    setFriendlyOverrides({})
    setSql(null)
    setResult(null)
  }, [parsed])

  const resolved = useMemo(
    () => (parsed ? resolveRolGames(parsed, seasonTeams, learned, colorOverrides, categoryOverrides) : null),
    [parsed, seasonTeams, learned, colorOverrides, categoryOverrides],
  )

  const finalGames = useMemo(() => {
    if (!resolved) return []
    const list = resolved.games.map((g) => ({
      ...g,
      home: teamOverrides[g.key]?.home ?? g.home,
      away: teamOverrides[g.key]?.away ?? g.away,
      include: !excluded.has(g.key),
      friendly: friendlyOverrides[g.key] ?? isDarkColor(g.color),
    }))
    const slotCount = new Map<string, number>()
    list.forEach((g) => {
      if (!g.include) return
      ;[g.home, g.away].forEach((name) => {
        if (!name) return
        const k = `${g.time}|${name}`
        slotCount.set(k, (slotCount.get(k) || 0) + 1)
      })
    })
    return list.map((g) => {
      const issues: string[] = []
      if (!g.category) issues.push("Elige la categoría")
      if (!g.home || !g.away) issues.push("Elige los equipos")
      if (g.home && g.home === g.away) issues.push("Es el mismo equipo")
      ;[g.home, g.away].forEach((name) => {
        if (name && (slotCount.get(`${g.time}|${name}`) || 0) > 1) issues.push(`${name.trim()} juega dos veces a las ${g.time}`)
      })
      return { ...g, issues }
    })
  }, [resolved, teamOverrides, excluded, friendlyOverrides])

  const included = finalGames.filter((g) => g.include)
  const withIssues = included.filter((g) => g.issues.length > 0)
  const colorEntries = resolved ? Object.entries(resolved.colorCategories) : []
  const categories = useMemo(
    () => (resolved?.categories || []).slice().sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b))),
    [resolved],
  )

  const existing = useMemo(() => {
    const j = Number(meta.jornada)
    if (!j || !meta.date) return { total: 0, locked: 0 }
    const list = games.filter(
      (g) => (!activeSeasonId || g.season_id === activeSeasonId) && Number(g.jornada) === j && dateKey(g.game_date) === meta.date,
    )
    return { total: list.length, locked: list.filter((g) => LOCKED_STATUSES.has(String(g.status))).length }
  }, [games, meta.jornada, meta.date, activeSeasonId])

  const loadGrid = useCallback((grid: RolGrid, label: string) => {
    setSheets([{ name: label, grid }])
    setSheetIndex(0)
    setSourceLabel(label)
    setReadError(null)
    setAiNotes([])
  }, [])

  const handleImage = async (file: File) => {
    setReading(true)
    setReadError(null)
    try {
      const image = await compressImage(file)
      const res = await fetch("/api/games/rol-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: await blobToBase64(image.blob), mime_type: image.blob.type }),
      })
      const data = await res.json().catch(() => ({ success: false, message: `Error ${res.status}` }))
      if (!data.success) throw new Error(data.message || "No se pudo leer la imagen")
      const imageGrid = gridFromImageResult(data.data)
      if (imageGrid.length <= 2) throw new Error("No encontré partidos en la imagen")
      loadGrid(imageGrid, file.name || "Imagen pegada")
      setAiNotes(data.data.notes ? [String(data.data.notes)] : [])
    } catch (err: any) {
      setReadError(`No pude leer la imagen: ${err?.message || err}`)
    } finally {
      setReading(false)
    }
  }

  const handleFile = async (file?: File | null) => {
    if (!file) return
    if (file.type.startsWith("image/")) return handleImage(file)
    if (!/\.xlsx$/i.test(file.name)) {
      setReadError("Sube el archivo en formato .xlsx (en Google Sheets: Archivo → Descargar → Microsoft Excel).")
      return
    }
    setReading(true)
    setReadError(null)
    try {
      const list = await readWorkbook(file)
      if (list.length === 0) throw new Error("El archivo no tiene hojas")
      const best = list.reduce((bi, s, i, arr) => (sheetJornada(s) > sheetJornada(arr[bi]) ? i : bi), 0)
      setSheets(list)
      setSheetIndex(best)
      setSourceLabel(file.name)
      setAiNotes([])
    } catch (err: any) {
      setReadError(`No pude leer el Excel: ${err?.message || err}`)
    } finally {
      setReading(false)
    }
  }

  const handlePaste = useCallback(
    (data: DataTransfer | null) => {
      if (!data) return false
      const image = Array.from(data.files || []).find((f) => f.type.startsWith("image/"))
      if (image) {
        handleImage(image)
        return true
      }
      const pasted = gridFromClipboard(data)
      if (!pasted) return false
      loadGrid(pasted, "Celdas pegadas")
      return true
    },
    [loadGrid],
  )

  useEffect(() => {
    if (sheets.length > 0) return
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (handlePaste(e.clipboardData)) e.preventDefault()
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [sheets.length, handlePaste])

  const reset = () => {
    setSheets([])
    setSourceLabel("")
    setResult(null)
    setReadError(null)
    setAiNotes([])
    setSql(null)
  }

  const setTeam = (key: string, side: "home" | "away", name: string) =>
    setTeamOverrides((prev) => ({ ...prev, [key]: { ...prev[key], [side]: name } }))

  const setCategory = (key: string, category: string) => {
    setCategoryOverrides((prev) => ({ ...prev, [key]: category }))
    setTeamOverrides((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const toggleInclude = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const publish = async () => {
    const jornada = Number(meta.jornada)
    if (!jornada || !meta.date) {
      setResult({ type: "error", text: "Falta el número de jornada o la fecha." })
      return
    }
    if (existing.locked > 0) {
      setResult({ type: "error", text: `La J${jornada} ya tiene partidos en vivo o finalizados; no se puede reemplazar.` })
      return
    }
    if (
      existing.total > 0 &&
      !window.confirm(`Ya hay ${existing.total} partidos de la J${jornada} el ${meta.date}. Se reemplazarán por los ${included.length} del rol. ¿Continuar?`)
    ) {
      return
    }
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch("/api/games/import-rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jornada,
          date: meta.date,
          venue: meta.venue,
          is_draft: isDraft,
          games: included.map((g) => ({
            time: g.time,
            field: g.field,
            category: g.category,
            home_team: g.home,
            away_team: g.away,
            friendly: g.friendly,
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setResult({ type: "error", text: data.message || "No se pudo publicar" })
        return
      }

      const nextLearned: LearnedAliases = { ...learned }
      finalGames.forEach((g) => {
        const o = teamOverrides[g.key]
        if (!o || !g.category) return
        nextLearned[g.category] = { ...(nextLearned[g.category] || {}) }
        if (o.home) nextLearned[g.category][compactKey(g.homeRaw)] = o.home
        if (o.away) nextLearned[g.category][compactKey(g.awayRaw)] = o.away
      })
      localStorage.setItem(LEARNED_KEY, JSON.stringify(nextLearned))
      setLearned(nextLearned)

      setResult({
        type: "success",
        text: `J${jornada} ${isDraft ? "guardada como borrador" : "publicada"}: ${data.data.inserted} partidos${
          data.data.deleted ? ` (reemplazó ${data.data.deleted})` : ""
        }.`,
      })
      onImported?.()
    } catch {
      setResult({ type: "error", text: "Error de conexión al publicar" })
    } finally {
      setSaving(false)
    }
  }

  const generateSql = () => {
    const jornada = Number(meta.jornada)
    if (!jornada || !meta.date) {
      setResult({ type: "error", text: "Falta el número de jornada o la fecha." })
      return
    }
    const notes = [
      ...aiNotes,
      ...included.flatMap((g) => [
        g.homeGuessed && !teamOverrides[g.key]?.home ? `${g.time} ${g.field}: "${g.homeRaw}" se tomó como ${g.home?.trim()}` : null,
        g.awayGuessed && !teamOverrides[g.key]?.away ? `${g.time} ${g.field}: "${g.awayRaw}" se tomó como ${g.away?.trim()}` : null,
      ]),
    ].filter(Boolean) as string[]
    setSql(
      buildRolSql({
        jornada,
        date: meta.date,
        venue: meta.venue.trim(),
        isDraft,
        games: included.map((g) => ({
          time: g.time,
          field: g.field,
          category: g.category,
          home: g.home!,
          away: g.away!,
          friendly: g.friendly,
          raw: `${g.homeRaw} vs ${g.awayRaw}`,
        })),
        excluded: finalGames.filter((g) => !g.include).map((g) => `${g.time} ${g.field} ${g.homeRaw} vs ${g.awayRaw}`),
        notes,
      }),
    )
    setCopied(false)
  }

  const copySql = async () => {
    if (!sql) return
    await navigator.clipboard.writeText(sql)
    setCopied(true)
  }

  const downloadSql = () => {
    if (!sql) return
    const url = URL.createObjectURL(new Blob([sql], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${meta.date || "rol"}-jornada-${meta.jornada || "x"}.sql`
    a.click()
    URL.revokeObjectURL(url)
  }

  const teamsByCategory = (category: string) =>
    seasonTeams.filter((t) => t.category === category).sort((a, b) => a.name.localeCompare(b.name))
  const otherTeams = (category: string) =>
    seasonTeams.filter((t) => t.category !== category).sort((a, b) => a.name.localeCompare(b.name))

  const renderTeamSelect = (g: (typeof finalGames)[number], side: "home" | "away") => {
    const value = (side === "home" ? g.home : g.away) || ""
    const raw = side === "home" ? g.homeRaw : g.awayRaw
    const options = side === "home" ? g.homeOptions : g.awayOptions
    const own = teamsByCategory(g.category)
    return (
      <select
        value={value}
        onChange={(e) => setTeam(g.key, side, e.target.value)}
        className={cn(
          fieldClass,
          "h-9 min-w-0 px-2 text-[13px]",
          !value && "border-amber-300 bg-amber-50 text-amber-800",
        )}
        title={`En el rol: ${raw}`}
      >
        <option value="">{options.length ? `¿Cuál es ${raw}?` : `${raw} → elegir…`}</option>
        {options.length > 0 && (
          <optgroup label={`Posibles para ${raw}`}>
            {options.map((name) => (
              <option key={`opt-${name}`} value={name}>
                {name.trim()}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={g.category ? getCategoryLabel(g.category) : "Equipos"}>
          {own.map((t) => (
            <option key={`own-${t.id ?? t.name}`} value={t.name}>
              {t.name.trim()}
            </option>
          ))}
        </optgroup>
        <optgroup label="Otras categorías">
          {otherTeams(g.category).map((t) => (
            <option key={`other-${t.id ?? t.name}`} value={t.name}>
              {t.name.trim()} · {getCategoryLabel(t.category)}
            </option>
          ))}
        </optgroup>
      </select>
    )
  }

  const timeGroups = useMemo(() => {
    const map = new Map<string, typeof finalGames>()
    finalGames.forEach((g) => map.set(g.time, [...(map.get(g.time) || []), g]))
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [finalGames])

  return (
    <div className="ui-v2 space-y-4">
      {sheets.length === 0 ? (
        <div className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60 sm:p-6">
          <h3 className="font-display text-xl font-extrabold italic text-slate-900">Importar rol de la jornada</h3>
          <p className="mt-1 text-sm text-slate-500">
            Sube el Excel o la imagen del rol, o pega las celdas desde Google Sheets. Detecto jornada, fecha, sede, campos,
            horarios y categorías por color; tú revisas y publicas o generas el SQL.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={reading}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith("image/"))
                if (file) handleImage(file)
              }}
              className="flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-brand-orange/60 hover:bg-slate-50 disabled:cursor-wait"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-white">
                {reading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              </span>
              <span className="font-semibold text-slate-900">{reading ? "Leyendo imagen…" : "Subir imagen del rol"}</span>
              <span className="text-xs text-slate-500">
                La foto o captura del rol con colores. También puedes pegarla con Ctrl+V
              </span>
            </button>
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImage(file)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                "flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition",
                dragging ? "border-brand-blue bg-brand-blue/5" : "border-slate-300 hover:border-brand-blue/60 hover:bg-slate-50",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ink text-white">
                {reading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
              </span>
              <span className="font-semibold text-slate-900">{reading ? "Leyendo Excel…" : "Subir Excel (.xlsx)"}</span>
              <span className="text-xs text-slate-500">Arrastra el archivo aquí o haz clic para elegirlo</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ""
              }}
            />

            <div
              tabIndex={0}
              onPaste={(e) => {
                if (handlePaste(e.clipboardData)) e.preventDefault()
              }}
              className="flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center outline-none transition focus:border-brand-pink focus:bg-brand-pink/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white">
                <ClipboardPaste className="h-5 w-5" />
              </span>
              <span className="font-semibold text-slate-900">Pegar desde Google Sheets</span>
              <span className="text-xs text-slate-500">
                Selecciona el rol en la hoja (incluye el título y los campos), copia con Ctrl+C y pega aquí con Ctrl+V
              </span>
            </div>
          </div>

          {readError && (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {readError}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rol cargado</p>
                <p className="truncate font-semibold text-slate-900">{sourceLabel}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Cargar otro
              </button>
            </div>

            {sheets.length > 1 && (
              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                {sheets.map((s, i) => (
                  <button
                    key={`${s.name}-${i}`}
                    type="button"
                    onClick={() => setSheetIndex(i)}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                      i === sheetIndex ? "bg-brand-ink text-white" : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-[120px_180px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Jornada</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={meta.jornada}
                  onChange={(e) => setMeta((m) => ({ ...m, jornada: e.target.value.replace(/\D/g, "") }))}
                  placeholder="6"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Fecha
                </span>
                <input
                  type="date"
                  className={fieldClass}
                  value={meta.date}
                  onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value }))}
                />
              </label>
              <label className="col-span-2 block md:col-span-1">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Sede
                </span>
                <input
                  className={fieldClass}
                  value={meta.venue}
                  onChange={(e) => setMeta((m) => ({ ...m, venue: e.target.value }))}
                  placeholder="Deportivo Tapias"
                />
              </label>
            </div>

            {existing.total > 0 && (
              <p
                className={cn(
                  "mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
                  existing.locked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800",
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {existing.locked
                  ? `La J${meta.jornada} ya tiene ${existing.locked} partidos en vivo o finalizados; no se puede reemplazar.`
                  : `Ya hay ${existing.total} partidos de la J${meta.jornada} en esa fecha. Al publicar se reemplazan por los de este rol.`}
              </p>
            )}

            {parsed && parsed.warnings.length + aiNotes.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                {[...aiNotes.map((n) => `Al leer la imagen: ${n}`), ...parsed.warnings].map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {colorEntries.length > 0 && (
            <div className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
              <h4 className="font-semibold text-slate-900">Colores del rol</h4>
              <p className="text-xs text-slate-500">Cada color se asigna a una categoría. Corrige si alguno no es el correcto.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {colorEntries.map(([color, category]) => {
                  const count = finalGames.filter((g) => (g.color || "none") === color).length
                  return (
                    <div key={color} className="flex items-center gap-3 rounded-2xl p-2 ring-1 ring-slate-200">
                      <span
                        className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-black/10"
                        style={{ background: color.startsWith("#") ? color : color === "none" ? "#ffffff" : "#cbd5e1" }}
                        title={color === "none" ? "Sin color" : color}
                      />
                      <select
                        value={category}
                        onChange={(e) => setColorOverrides((prev) => ({ ...prev, [color]: e.target.value }))}
                        className={cn(fieldClass, "h-9 min-w-0 flex-1", !category && "border-amber-300 bg-amber-50")}
                      >
                        <option value="">Elegir categoría…</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {getCategoryLabel(c)}
                          </option>
                        ))}
                      </select>
                      <span className="shrink-0 pr-1 text-xs font-semibold text-slate-500">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {timeGroups.map(([time, list]) => (
              <div key={time} className="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
                <p className="mb-2 font-display text-lg font-extrabold italic text-slate-900">{time}</p>
                <div className="space-y-2">
                  {list.map((g) => (
                    <div
                      key={g.key}
                      className={cn(
                        "rounded-2xl p-3 ring-1 transition",
                        !g.include
                          ? "bg-slate-50 opacity-50 ring-slate-200"
                          : g.issues.length
                            ? "bg-amber-50/60 ring-amber-300"
                            : "bg-white ring-slate-200",
                      )}
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="flex items-center gap-2 lg:w-[300px] lg:shrink-0">
                          <input
                            type="checkbox"
                            checked={g.include}
                            onChange={() => toggleInclude(g.key)}
                            className="h-4 w-4 shrink-0 accent-[#0857b5]"
                            aria-label="Incluir partido"
                          />
                          <span
                            className="h-6 w-1.5 shrink-0 rounded-full ring-1 ring-black/10"
                            style={{ background: g.color?.startsWith("#") ? g.color : "#e2e8f0" }}
                          />
                          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            {g.field}
                          </span>
                          <select
                            value={g.category}
                            onChange={(e) => setCategory(g.key, e.target.value)}
                            className={cn(fieldClass, "h-9 min-w-0 flex-1 px-2 text-[13px]", !g.category && "border-amber-300 bg-amber-50")}
                          >
                            <option value="">Categoría…</option>
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {getCategoryLabel(c)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                          {renderTeamSelect(g, "home")}
                          <span className="font-display text-sm font-extrabold italic text-slate-300">VS</span>
                          {renderTeamSelect(g, "away")}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-[11px]">
                        <span className="text-slate-400">
                          Rol: {g.homeRaw} vs {g.awayRaw}
                        </span>
                        <label
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1",
                            g.friendly ? "bg-slate-900 text-white ring-slate-900" : "text-slate-500 ring-slate-200",
                          )}
                          title="Los amistosos no suman puntos en la tabla"
                        >
                          <input
                            type="checkbox"
                            checked={g.friendly}
                            onChange={(e) => setFriendlyOverrides((prev) => ({ ...prev, [g.key]: e.target.checked }))}
                            className="h-3 w-3 accent-[#e266be]"
                          />
                          Amistoso
                        </label>
                        {g.include &&
                          [
                            g.homeGuessed && !teamOverrides[g.key]?.home ? `${g.homeRaw} → ${g.home?.trim()}` : null,
                            g.awayGuessed && !teamOverrides[g.key]?.away ? `${g.awayRaw} → ${g.away?.trim()}` : null,
                          ]
                            .filter(Boolean)
                            .map((hint) => (
                              <span key={hint} className="font-semibold text-brand-blue">
                                {hint} (adivinado, revisa)
                              </span>
                            ))}
                        {g.include &&
                          g.issues.map((issue) => (
                            <span key={issue} className="inline-flex items-center gap-1 font-semibold text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              {issue}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-3 z-20 space-y-2">
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg",
                    result.type === "success" ? "bg-emerald-600" : "bg-red-600",
                  )}
                >
                  {result.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                  <span className="flex-1">{result.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-brand-ink p-2 pl-5 text-white shadow-xl sm:rounded-full">
              <div className="min-w-0 flex-1 py-1">
                <p className="text-sm font-semibold">
                  {included.length} partidos
                  {included.some((g) => g.friendly) && (
                    <span className="text-white/70"> · {included.filter((g) => g.friendly).length} amistosos</span>
                  )}
                  {withIssues.length > 0 ? (
                    <span className="text-amber-300"> · {withIssues.length} por revisar</span>
                  ) : (
                    <span className="text-emerald-300"> · listos</span>
                  )}
                </p>
                <label className="mt-0.5 inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/70">
                  <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} className="accent-[#e266be]" />
                  Guardar como borrador (no se publica)
                </label>
              </div>
              <button
                type="button"
                onClick={generateSql}
                disabled={included.length === 0 || withIssues.length > 0}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                Generar SQL
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={saving || included.length === 0 || withIssues.length > 0 || existing.locked > 0}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDraft ? <Upload className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {isDraft ? "Guardar borrador" : `Publicar J${meta.jornada || "?"}`}
              </button>
            </div>
          </div>
        </>
      )}

      {sql && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSql(null)}>
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-lg font-extrabold italic text-slate-900">SQL de la J{meta.jornada}</h4>
                <p className="text-xs text-slate-500">
                  Pégalo en el SQL Editor de Supabase. Reemplaza los partidos de esa jornada y fecha, y trae verificaciones al final.
                </p>
              </div>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-sm font-semibold text-white"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={downloadSql}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
              <button
                type="button"
                onClick={() => setSql(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              readOnly
              value={sql}
              className="min-h-[50vh] flex-1 resize-none rounded-2xl bg-slate-950 p-4 font-mono text-[12px] leading-relaxed text-slate-100"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
