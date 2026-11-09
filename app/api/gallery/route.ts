import { type NextRequest, NextResponse } from "next/server"
import { activeSeason, loadGallery } from "@/lib/gallery"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const season = await activeSeason()
    if (!season) return NextResponse.json({ success: true, season: null, jornadas: [], jornada: null, photos: [] })
    const jornada = searchParams.get("jornada") ? Number(searchParams.get("jornada")) : null
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    const data = await loadGallery(season.id, jornada, limit)
    return NextResponse.json({ success: true, season, ...data })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
