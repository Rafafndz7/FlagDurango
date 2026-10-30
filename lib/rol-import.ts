import { resolveTeamAlias } from "@/lib/team-aliases-otono-2026"

/** Celda del rol tal como viene del Excel o de Google Sheets */
export type RolCell = { text: string; color: string | null }
export type RolGrid = RolCell[][]

export type ParsedRolGame = {
  key: string
  time: string
  field: string
  homeRaw: string
  awayRaw: string
  color: string | null
}

export type ParsedRol = {
  jornada: number | null
  date: string | null
  venue: string
  games: ParsedRolGame[]
  warnings: string[]
}

export type RolTeam = { id?: number | string; name: string; category?: string | null }

/** category → { alias compacto → nombre exacto del equipo } aprendido de correcciones anteriores */
export type LearnedAliases = Record<string, Record<string, string>>

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const CATEGORY_SUFFIX_TOKENS = new Set(["fs", "ms", "mg", "vs", "vg", "vl", "ml", "fc", "fca", "fcb", "fg", "fl"])

export function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[✦◆◇★☆•·]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const compactKey = (value: string) => normalizeText(value).replace(/[^a-z0-9]/g, "")

/** "8:00AM", "1:00 p. m.", "13:00" → "08:00" / "13:00" */
export function parseTime(text: string): string | null {
  const t = normalizeText(text).replace(/\s+/g, "")
  const m = t.match(/^(\d{1,2})(?::|\.)?(\d{2})?(?::\d{2})?(a\.?m\.?|p\.?m\.?)?$/)
  if (!m) return null
  let hour = Number(m[1])
  const minute = Number(m[2] || 0)
  const suffix = m[3]?.replace(/\./g, "")
  if (hour > 23 || minute > 59) return null
  if (suffix === "pm" && hour < 12) hour += 12
  else if (suffix === "am" && hour === 12) hour = 0
  else if (!suffix && hour >= 1 && hour <= 7) hour += 12
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/** "Jornada 6: 25 de Octubre. Deportivo Tapias" → jornada, fecha y sede */
export function parseHeader(text: string, year: number) {
  const jornadaMatch = text.match(/jornada\s*(\d+)/i)
  const jornada = jornadaMatch ? Number(jornadaMatch[1]) : null

  let date: string | null = null
  let venue = ""
  const dateRe = /(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?/gi
  let m: RegExpExecArray | null
  while ((m = dateRe.exec(text))) {
    const month = MONTHS[normalizeText(m[2])]
    if (!month) continue
    const day = Number(m[1])
    const y = m[3] ? Number(m[3]) : year
    date = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    venue = text
      .slice(m.index + m[0].length)
      .replace(/^[\s.,:;\-–—|]+/, "")
      .trim()
    break
  }
  return { jornada, date, venue }
}

const splitVs = (text: string) => {
  const parts = text.split(/\s+v\.?s\.?\s+/i)
  if (parts.length !== 2) return null
  const [home, away] = parts.map((p) => p.trim())
  return home && away ? { home, away } : null
}

export function parseRolGrid(grid: RolGrid, year: number): ParsedRol {
  const warnings: string[] = []
  let header = { jornada: null as number | null, date: null as string | null, venue: "" }

  outer: for (const row of grid) {
    for (const cell of row) {
      if (/jornada\s*\d+/i.test(cell.text)) {
        header = parseHeader(cell.text, year)
        break outer
      }
    }
  }

  let fieldRowIndex = -1
  let fieldCols: Map<number, string> = new Map()
  for (let r = 0; r < grid.length; r++) {
    const cols = new Map<number, string>()
    grid[r].forEach((cell, c) => {
      const m = cell.text.trim().match(/^(campo|cancha)\s*(.+)$/i)
      if (m) cols.set(c, `Campo ${m[2].trim().toUpperCase()}`)
    })
    if (cols.size >= 1) {
      fieldRowIndex = r
      fieldCols = cols
      break
    }
  }

  if (fieldRowIndex === -1) {
    warnings.push("No encontré la fila con los campos (\"Campo A\", \"Campo B\"…).")
    return { ...header, games: [], warnings }
  }

  const games: ParsedRolGame[] = []
  for (let r = fieldRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] || []
    let time: string | null = null
    row.forEach((cell, c) => {
      if (!time && !fieldCols.has(c)) time = parseTime(cell.text)
    })

    fieldCols.forEach((field, c) => {
      const cell = row[c]
      if (!cell?.text.trim()) return
      const pair = splitVs(cell.text)
      if (!pair) {
        warnings.push(`No entendí "${cell.text.trim()}" (${field}).`)
        return
      }
      if (!time) {
        warnings.push(`"${cell.text.trim()}" (${field}) no tiene hora en su fila.`)
        return
      }
      games.push({
        key: `${r}-${c}`,
        time,
        field,
        homeRaw: pair.home,
        awayRaw: pair.away,
        color: cell.color,
      })
    })
  }

  if (games.length === 0) warnings.push("No encontré partidos con formato \"EQUIPO vs EQUIPO\".")
  return { ...header, games, warnings }
}

const nameWords = (name: string) => normalizeText(name).split(" ").filter((w) => w && !CATEGORY_SUFFIX_TOKENS.has(w))

/** Resuelve una abreviatura ("TLA", "130", "JL") al nombre exacto de un equipo de la categoría */
export function resolveAbbreviation(
  raw: string,
  category: string,
  teams: RolTeam[],
  learned: LearnedAliases,
  fuzzy = false,
): { name: string | null; ambiguous: string[]; guessed?: boolean } {
  const key = compactKey(raw)
  if (!key) return { name: null, ambiguous: [] }
  const inCategory = teams.filter((t) => t.category === category)
  const byTrimmed = (name: string | null | undefined, list: RolTeam[]) =>
    name ? list.find((t) => t.name.trim() === name.trim())?.name ?? null : null

  const learnedName = byTrimmed(learned[category]?.[key], teams)
  if (learnedName) return { name: learnedName, ambiguous: [] }

  const aliasName = byTrimmed(resolveTeamAlias(category, raw), inCategory)
  if (aliasName) return { name: aliasName, ambiguous: [] }

  const exact = inCategory.filter(
    (t) => compactKey(t.name) === key || nameWords(t.name).join("") === key,
  )
  if (exact.length === 1) return { name: exact[0].name, ambiguous: [] }

  const candidates = inCategory.filter((t) => {
    const words = nameWords(t.name)
    if (words.length === 0) return false
    const initials = words.map((w) => w[0]).join("")
    if (key.length >= 2 && initials === key) return true
    return words.some((w) => w.replace(/[^a-z0-9]/g, "").startsWith(key))
  })
  if (candidates.length === 1) return { name: candidates[0].name, ambiguous: [] }
  if (candidates.length > 1 || !fuzzy) return { name: null, ambiguous: candidates.map((t) => t.name) }

  // Letras en orden dentro del nombre ("cop" → COBRAS Prime)
  const subsequence = inCategory.filter((t) => {
    const compact = nameWords(t.name).join("").replace(/[^a-z0-9]/g, "")
    if (key.length < 2 || compact[0] !== key[0]) return false
    let i = 0
    for (const ch of compact) if (ch === key[i]) i++
    return i === key.length
  })
  if (subsequence.length === 1) return { name: subsequence[0].name, ambiguous: [], guessed: true }
  return { name: null, ambiguous: subsequence.map((t) => t.name) }
}

export type ResolvedRolGame = ParsedRolGame & {
  category: string
  home: string | null
  away: string | null
  homeOptions: string[]
  awayOptions: string[]
  homeGuessed: boolean
  awayGuessed: boolean
}

/**
 * Asigna categoría a cada partido: primero por el color (cada color se asocia a la
 * categoría donde más partidos de ese color se resuelven) y si no, por los equipos.
 */
export function resolveRolGames(
  parsed: ParsedRol,
  teams: RolTeam[],
  learned: LearnedAliases,
  colorOverrides: Record<string, string>,
  categoryOverrides: Record<string, string>,
) {
  const categories = Array.from(new Set(teams.map((t) => t.category).filter(Boolean) as string[]))

  const candidatesFor = (g: ParsedRolGame) =>
    categories.filter((cat) => {
      const home = resolveAbbreviation(g.homeRaw, cat, teams, learned).name
      const away = resolveAbbreviation(g.awayRaw, cat, teams, learned).name
      return !!home && !!away && home !== away
    })

  /** Categorías donde ambos equipos al menos tienen opciones (abreviatura ambigua) */
  const partialCandidatesFor = (g: ParsedRolGame) =>
    categories.filter((cat) => {
      const home = resolveAbbreviation(g.homeRaw, cat, teams, learned)
      const away = resolveAbbreviation(g.awayRaw, cat, teams, learned)
      return (!!home.name || home.ambiguous.length > 0) && (!!away.name || away.ambiguous.length > 0)
    })

  const candidateMap = new Map(parsed.games.map((g) => [g.key, candidatesFor(g)]))

  const votes = new Map<string, Map<string, number>>()
  for (const g of parsed.games) {
    const colorKey = g.color || "none"
    let cands = candidateMap.get(g.key) || []
    let weight = 1
    if (!cands.length) {
      cands = partialCandidatesFor(g)
      weight = 0.5
    }
    if (!cands.length) continue
    const tally = votes.get(colorKey) || new Map<string, number>()
    cands.forEach((c) => tally.set(c, (tally.get(c) || 0) + weight / cands.length))
    votes.set(colorKey, tally)
  }

  const colorCategories: Record<string, string> = {}
  for (const g of parsed.games) {
    const colorKey = g.color || "none"
    if (colorKey in colorCategories) continue
    const tally = votes.get(colorKey)
    const best = tally ? Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined
    colorCategories[colorKey] = colorOverrides[colorKey] || best || ""
  }

  const games: ResolvedRolGame[] = parsed.games.map((g) => {
    const colorKey = g.color || "none"
    const cands = candidateMap.get(g.key) || []
    const colorCat = colorCategories[colorKey]
    let category = categoryOverrides[g.key] || ""
    if (!category) {
      if (colorCat && (cands.includes(colorCat) || colorOverrides[colorKey])) category = colorCat
      else if (cands.length === 1) category = cands[0]
      else category = colorCat || cands[0] || ""
    }
    const empty = { name: null, ambiguous: [] as string[], guessed: false }
    const home = category ? resolveAbbreviation(g.homeRaw, category, teams, learned, true) : empty
    const away = category ? resolveAbbreviation(g.awayRaw, category, teams, learned, true) : empty
    return {
      ...g,
      category,
      home: home.name,
      away: away.name,
      homeOptions: home.ambiguous,
      awayOptions: away.ambiguous,
      homeGuessed: !!home.guessed,
      awayGuessed: !!away.guessed,
    }
  })

  return { games, colorCategories, categories }
}
