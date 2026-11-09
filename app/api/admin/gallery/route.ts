import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { GALLERY_BUCKET, GALLERY_TABLE_HINT, activeSeason, loadGallery } from "@/lib/gallery"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = ["image/webp", "image/jpeg"]

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })
    const jornadaParam = new URL(request.url).searchParams.get("jornada")

    const { data: games } = await supabase
      .from("games")
      .select("jornada, game_date")
      .eq("season_id", season.id)
      .not("jornada", "is", null)
    const today = new Date().toISOString().slice(0, 10)
    const gameJornadas = Array.from(new Set((games || []).map((g) => Number(g.jornada)))).sort((a, b) => a - b)
    const played = (games || []).filter((g) => String(g.game_date || "").slice(0, 10) <= today).map((g) => Number(g.jornada))
    const currentJornada = played.length ? Math.max(...played) : gameJornadas[0] ?? 1

    const data = await loadGallery(season.id, jornadaParam ? Number(jornadaParam) : currentJornada)
    return NextResponse.json({ success: true, season, game_jornadas: gameJornadas, current_jornada: currentJornada, ...data })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

/** Recibe una foto ya comprimida en el navegador (grande + miniatura) y la guarda. */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })

    const form = await request.formData()
    const file = form.get("file")
    const thumb = form.get("thumb")
    const jornada = Number(form.get("jornada"))
    if (!(file instanceof Blob) || !(thumb instanceof Blob) || !jornada) {
      return NextResponse.json({ success: false, message: "Faltan la foto o la jornada" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type) || !ALLOWED.includes(thumb.type)) {
      return NextResponse.json({ success: false, message: "La foto debe llegar comprimida (WebP o JPG)" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: "La foto comprimida pesa más de 4 MB" }, { status: 400 })
    }

    const ext = file.type === "image/webp" ? "webp" : "jpg"
    const thumbExt = thumb.type === "image/webp" ? "webp" : "jpg"
    const base = `gallery/${season.id}/j${jornada}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const storagePath = `${base}.${ext}`
    const thumbPath = `${base}-thumb.${thumbExt}`

    const bucket = supabase.storage.from(GALLERY_BUCKET)
    const options = { upsert: false, cacheControl: "31536000" }
    const [fullUp, thumbUp] = await Promise.all([
      bucket.upload(storagePath, Buffer.from(await file.arrayBuffer()), { ...options, contentType: file.type }),
      bucket.upload(thumbPath, Buffer.from(await thumb.arrayBuffer()), { ...options, contentType: thumb.type }),
    ])
    if (fullUp.error || thumbUp.error) {
      await bucket.remove([storagePath, thumbPath])
      throw new Error(`No se pudo subir a Storage: ${(fullUp.error || thumbUp.error)!.message}`)
    }

    const caption = String(form.get("caption") || "").trim() || null
    const { data, error } = await supabase
      .from("gallery_photos")
      .insert({
        season_id: season.id,
        jornada,
        url: bucket.getPublicUrl(storagePath).data.publicUrl,
        thumb_url: bucket.getPublicUrl(thumbPath).data.publicUrl,
        storage_path: storagePath,
        thumb_path: thumbPath,
        width: Number(form.get("width")) || null,
        height: Number(form.get("height")) || null,
        size_bytes: file.size + thumb.size,
        caption,
      })
      .select("id, jornada, url, thumb_url, width, height, caption, created_at")
      .single()
    if (error) {
      await bucket.remove([storagePath, thumbPath])
      throw new Error(/gallery_photos/.test(error.message) ? `${error.message} (${GALLERY_TABLE_HINT})` : error.message)
    }
    return NextResponse.json({ success: true, photo: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
  try {
    const ids = (new URL(request.url).searchParams.get("ids") || "")
      .split(",")
      .map(Number)
      .filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ success: false, message: "Faltan fotos" }, { status: 400 })

    const { data: rows, error } = await supabase.from("gallery_photos").select("id, storage_path, thumb_path").in("id", ids)
    if (error) throw new Error(error.message)
    const paths = (rows || []).flatMap((r) => [r.storage_path, r.thumb_path]).filter(Boolean)
    if (paths.length) await supabase.storage.from(GALLERY_BUCKET).remove(paths)
    const { error: delError } = await supabase.from("gallery_photos").delete().in("id", ids)
    if (delError) throw new Error(delError.message)
    return NextResponse.json({ success: true, deleted: rows?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
