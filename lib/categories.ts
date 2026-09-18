/** Categorías oficiales Flag Durango — fuente única de labels/slugs */

export type CategorySlug = string

export const CATEGORY_LABELS: Record<string, string> = {
  "varonil-gold": "Varonil Gold",
  "varonil-master": "Varonil Master",
  "varonil-silver": "Varonil Silver",
  "varonil-cooper": "Varonil Cooper",
  "femenil-gold": "Femenil Gold",
  "femenil-silver": "Femenil Silver",
  "femenil-cooper": "Femenil Cooper A", // legacy alias
  "femenil-cooper-a": "Femenil Cooper A",
  "femenil-cooper-b": "Femenil Cooper B",
  "mixto-gold": "Mixto Gold",
  "mixto-silver": "Mixto Silver",
  "mixto-cooper": "Mixto Cooper",
  teens: "Teens",
  "1v1": "1v1",
}

export const CATEGORY_SUFFIXES: Record<string, string> = {
  "varonil-gold": "VG",
  "varonil-master": "VM",
  "varonil-silver": "VS",
  "varonil-cooper": "VC",
  "femenil-gold": "FG",
  "femenil-silver": "FS",
  "femenil-cooper": "FCA",
  "femenil-cooper-a": "FCA",
  "femenil-cooper-b": "FCB",
  "mixto-gold": "MG",
  "mixto-silver": "MS",
  "mixto-cooper": "MC",
  teens: "T",
}

export const CATEGORY_COLORS: Record<string, string> = {
  "varonil-gold": "bg-yellow-600",
  "varonil-master": "bg-amber-700",
  "varonil-silver": "bg-slate-500",
  "varonil-cooper": "bg-orange-700",
  "femenil-gold": "bg-rose-600",
  "femenil-silver": "bg-pink-400",
  "femenil-cooper": "bg-pink-600",
  "femenil-cooper-a": "bg-pink-600",
  "femenil-cooper-b": "bg-fuchsia-700",
  "mixto-gold": "bg-violet-600",
  "mixto-silver": "bg-indigo-400",
  "mixto-cooper": "bg-purple-700",
  teens: "bg-teal-600",
  "1v1": "bg-cyan-600",
}

/** Opciones estándar para selects de equipo/juego */
export const TEAM_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "varonil-gold", label: "Varonil Gold (VG)" },
  { value: "varonil-silver", label: "Varonil Silver (VS)" },
  { value: "varonil-cooper", label: "Varonil Cooper (VC)" },
  { value: "femenil-gold", label: "Femenil Gold (FG)" },
  { value: "femenil-silver", label: "Femenil Silver (FS)" },
  { value: "femenil-cooper-a", label: "Femenil Cooper A (FCA)" },
  { value: "femenil-cooper-b", label: "Femenil Cooper B (FCB)" },
  { value: "mixto-gold", label: "Mixto Gold (MG)" },
  { value: "mixto-silver", label: "Mixto Silver (MS)" },
  { value: "mixto-cooper", label: "Mixto Cooper (MC)" },
  { value: "teens", label: "Teens (T)" },
]

export const ALL_CATEGORIES = TEAM_CATEGORY_OPTIONS.map(({ value, label }) => ({
  value,
  label: label.replace(/\s*\([^)]*\)\s*$/, ""),
}))

export function normalizeCategory(value: unknown): string {
  if (value === undefined || value === null) return ""
  let slug = String(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .trim()
  // Compatibilidad: femenil-cooper → femenil-cooper-a
  if (slug === "femenil-cooper") slug = "femenil-cooper-a"
  return slug
}

export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Sin categoría"
  const normalized = normalizeCategory(category)
  return CATEGORY_LABELS[normalized] || CATEGORY_LABELS[category] || category
}

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return "bg-gray-600"
  const normalized = normalizeCategory(category)
  return CATEGORY_COLORS[normalized] || CATEGORY_COLORS[category] || "bg-gray-600"
}

export function getCategorySuffix(category: string | null | undefined): string {
  if (!category) return ""
  const normalized = normalizeCategory(category)
  return CATEGORY_SUFFIXES[normalized] || ""
}
