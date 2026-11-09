export interface PlayerGameStatLine {
  pases_completos?: number | null
  touchdowns_pase?: number | null
  intercepciones_lanzadas?: number | null
  yardas_pase?: number | null
  carreras?: number | null
  yardas_carrera?: number | null
  touchdowns_carrera?: number | null
  recepciones?: number | null
  yardas_recepcion?: number | null
  touchdowns_recepcion?: number | null
  puntos_extra?: number | null
  sacks?: number | null
  intercepciones?: number | null
  yardas_intercepcion?: number | null
  touchdowns_intercepcion?: number | null
  pases_defendidos?: number | null
  banderas_jaladas?: number | null
}

/** Puntos por acción. Debe coincidir con scripts/2026-11-09-mvps-sugeridos.sql. */
export const MVP_WEIGHTS = {
  td_anotado: 6,
  td_pase: 4,
  pase_completo: 1,
  recepcion: 1,
  intercepcion: 5,
  sack: 3,
  pase_defendido: 2,
  bandera: 1,
  punto_extra: 1,
  intercepcion_lanzada: -3,
  yardas_por_punto: 20,
  victoria: 3,
} as const

const n = (v: number | null | undefined) => Number(v) || 0

export function mvpScore(s: PlayerGameStatLine, won: boolean) {
  const w = MVP_WEIGHTS
  const tdScored = n(s.touchdowns_recepcion) + n(s.touchdowns_carrera) + n(s.touchdowns_intercepcion)
  const yards = n(s.yardas_pase) + n(s.yardas_carrera) + n(s.yardas_recepcion) + n(s.yardas_intercepcion)
  return (
    w.td_anotado * tdScored +
    w.td_pase * n(s.touchdowns_pase) +
    w.pase_completo * n(s.pases_completos) +
    w.recepcion * n(s.recepciones) +
    w.intercepcion * n(s.intercepciones) +
    w.sack * n(s.sacks) +
    w.pase_defendido * n(s.pases_defendidos) +
    w.bandera * n(s.banderas_jaladas) +
    w.punto_extra * n(s.puntos_extra) +
    w.intercepcion_lanzada * n(s.intercepciones_lanzadas) +
    Math.floor(yards / w.yardas_por_punto) +
    (won ? w.victoria : 0)
  )
}

const DETAIL_PARTS: [keyof PlayerGameStatLine | "td", string][] = [
  ["td", "TD"],
  ["touchdowns_pase", "TD pase"],
  ["pases_completos", "PC"],
  ["recepciones", "REC"],
  ["intercepciones", "INT"],
  ["sacks", "SACK"],
  ["pases_defendidos", "PD"],
  ["banderas_jaladas", "BAND"],
  ["puntos_extra", "PX"],
  ["intercepciones_lanzadas", "INT lanz."],
]

export function sumStatLines(lines: PlayerGameStatLine[]): PlayerGameStatLine {
  const total: Record<string, number> = {}
  for (const line of lines) {
    for (const [k, v] of Object.entries(line)) {
      if (typeof v === "number" || v == null) total[k] = (total[k] || 0) + n(v as number | null)
    }
  }
  return total as PlayerGameStatLine
}

export function mvpDetail(s: PlayerGameStatLine) {
  const td = n(s.touchdowns_recepcion) + n(s.touchdowns_carrera) + n(s.touchdowns_intercepcion)
  return DETAIL_PARTS.map(([key, label]) => {
    const value = key === "td" ? td : n(s[key])
    return value ? `${value} ${label}` : null
  })
    .filter(Boolean)
    .join(" · ")
}
