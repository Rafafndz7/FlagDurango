export type SeasonStatus = "draft" | "active" | "archived"

export interface Season {
  id: string
  name: string
  year: number
  status: SeasonStatus
  is_active: boolean
  start_date: string | null
  end_date: string | null
  game_count?: number
}

export function requireSeasonId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Selecciona una temporada antes de guardar.")
  }
  return value.trim()
}

export function normalizeGameType(value: unknown): "regular" | "playoff" | "friendly" {
  if (value === "playoff" || value === "friendly") return value
  return "regular"
}

export function shouldCountForStandings(gameType: unknown) {
  return normalizeGameType(gameType) === "regular"
}

