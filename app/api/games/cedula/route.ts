import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { buildCedulaDocx } from "@/lib/cedula-docx"
import { getCategoryLabel } from "@/lib/categories"

function isAdmin(req: NextRequest) {
  try {
    const user = JSON.parse(req.cookies.get("auth-token")?.value || "{}")
    return user?.role === "admin"
  } catch {
    return false
  }
}

function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40)
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const id = Number(new URL(req.url).searchParams.get("id"))
    if (!id) {
      return NextResponse.json({ success: false, message: "id de partido requerido" }, { status: 400 })
    }

    const { data: game, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    if (!game) {
      return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 })
    }

    const buffer = await buildCedulaDocx(game, getCategoryLabel(game.category))
    const datePart = (game.game_date || "").toString().slice(0, 10) || "sin-fecha"
    const filename = `Cedula_${safeFilename(game.home_team)}_vs_${safeFilename(game.away_team)}_${datePart}.docx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("GET /api/games/cedula", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Error generando cédula" },
      { status: 500 },
    )
  }
}
