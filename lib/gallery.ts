import { supabase } from "@/lib/supabase-admin"

export const GALLERY_BUCKET = "uploads"
export const GALLERY_TABLE_HINT = "corre scripts/2026-11-09-galeria-y-mvps.sql en Supabase"

export interface GalleryPhoto {
  id: number
  jornada: number
  url: string
  thumb_url: string
  width: number | null
  height: number | null
  caption: string | null
  created_at: string
}

export async function activeSeason() {
  const { data } = await supabase.from("seasons").select("id, name").eq("is_active", true).maybeSingle()
  return data as { id: string; name: string } | null
}

/** Jornadas con fotos (con portada y conteo) y las fotos de la jornada pedida o de la más reciente. */
export async function loadGallery(seasonId: string, jornada?: number | null, limit?: number) {
  const index: { jornada: number; thumb_url: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("jornada, thumb_url")
      .eq("season_id", seasonId)
      .order("created_at")
      .range(from, from + 999)
    if (error) throw new Error(/gallery_photos/.test(error.message) ? `${error.message} (${GALLERY_TABLE_HINT})` : error.message)
    index.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const byJornada = new Map<number, { jornada: number; count: number; cover: string }>()
  for (const row of index) {
    const entry = byJornada.get(row.jornada) || { jornada: row.jornada, count: 0, cover: row.thumb_url }
    entry.count += 1
    byJornada.set(row.jornada, entry)
  }
  const jornadas = Array.from(byJornada.values()).sort((a, b) => b.jornada - a.jornada)
  const current = jornada ?? jornadas[0]?.jornada ?? null

  let photos: GalleryPhoto[] = []
  if (current != null) {
    let query = supabase
      .from("gallery_photos")
      .select("id, jornada, url, thumb_url, width, height, caption, created_at")
      .eq("season_id", seasonId)
      .eq("jornada", current)
      .order("created_at")
      .order("id")
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    photos = (data || []) as GalleryPhoto[]
  }

  return { jornadas, jornada: current, photos }
}
