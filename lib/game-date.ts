export const dateKey = (value: string | null | undefined) => String(value || "").slice(0, 10)

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Interpreta YYYY-MM-DD como día local, sin importar la zona horaria del dispositivo */
export const parseGameDate = (value: string | null | undefined) => {
  const key = dateKey(value)
  return key ? new Date(`${key}T12:00:00`) : null
}

export const formatGameDate = (value: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  const d = parseGameDate(value)
  return d ? d.toLocaleDateString("es-MX", options) : ""
}

/** { day: "04", month: "OCT", weekday: "DOM" } para tarjetas de fecha */
export const gameDateParts = (value: string | null | undefined) => {
  const d = parseGameDate(value)
  if (!d) return null
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "").toUpperCase(),
    weekday: d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "").toUpperCase(),
  }
}

export const formatGameTime = (value: string | null | undefined) => (value ? String(value).slice(0, 5) : "")
