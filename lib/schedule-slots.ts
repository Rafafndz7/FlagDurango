/** Horarios y campos oficiales para el generador de partidos Flag Durango */

export const SCHEDULE_FIELDS = ["A", "B", "C", "D", "E", "F"] as const
export type ScheduleField = (typeof SCHEDULE_FIELDS)[number]

/** Bloques por familia de categoría (hora local 24h) */
export const SCHEDULE_BLOCKS = {
  cooper: {
    label: "Cooper",
    hours: ["08:00", "09:00"] as const,
    match: (category: string) => /cooper/i.test(category),
  },
  femenil: {
    label: "Femenil",
    hours: ["10:00", "11:00"] as const,
    match: (category: string) => category.startsWith("femenil") && !/cooper/i.test(category),
  },
  mixto: {
    label: "Mixto",
    hours: ["12:00", "13:00"] as const,
    match: (category: string) => category.startsWith("mixto"),
  },
  varonil: {
    label: "Varonil",
    hours: ["14:00", "15:00"] as const,
    match: (category: string) =>
      category.startsWith("varonil") || category === "varonil-libre" || category === "teens",
  },
} as const

export type ScheduleBlockKey = keyof typeof SCHEDULE_BLOCKS

export function getBlockForCategory(category: string): ScheduleBlockKey | null {
  const slug = (category || "").toLowerCase()
  // Cooper tiene prioridad (femenil-cooper-a/b, varonil-cooper, mixto-cooper)
  if (SCHEDULE_BLOCKS.cooper.match(slug)) return "cooper"
  if (SCHEDULE_BLOCKS.femenil.match(slug)) return "femenil"
  if (SCHEDULE_BLOCKS.mixto.match(slug)) return "mixto"
  if (SCHEDULE_BLOCKS.varonil.match(slug)) return "varonil"
  return null
}

export function getAllowedHours(category: string): string[] {
  const block = getBlockForCategory(category)
  if (!block) return []
  return [...SCHEDULE_BLOCKS[block].hours]
}

export function isHourAllowedForCategory(category: string, time: string): boolean {
  const hour = String(time || "").slice(0, 5)
  const allowed = getAllowedHours(category)
  return allowed.includes(hour)
}

export function formatFieldName(letter: string): string {
  const L = letter.replace(/^campo\s*/i, "").trim().toUpperCase()
  return `Campo ${L}`
}

export function normalizeFieldLetter(field: string | null | undefined): string {
  if (!field) return ""
  const m = String(field).toUpperCase().match(/\b([A-F])\b/)
  return m?.[1] || String(field).trim()
}

export type SlotKey = string // `${date}|${time}|${fieldLetter}`

export function makeSlotKey(date: string, time: string, field: string): SlotKey {
  return `${date.slice(0, 10)}|${String(time).slice(0, 5)}|${normalizeFieldLetter(field)}`
}
