import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { normalizeCategory } from "@/lib/categories"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

const EDITABLE_FIELDS = [
  "name",
  "category",
  "status",
  "color1",
  "color2",
  "logo_url",
  "captain_name",
  "captain_phone",
  "coach_name",
  "coach_phone",
  "paid",
] as const

/**
 * Edita un equipo desde "Editar tablas". Si cambia el nombre, renombra también sus partidos
 * de la temporada (los partidos referencian equipos por nombre).
 */
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, message: "Solo admin" }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const id = Number(body.id)
    if (!Number.isFinite(id)) return NextResponse.json({ success: false, message: "ID requerido" }, { status: 400 })

    const { data: current, error: currentError } = await supabase
      .from("teams")
      .select("id, name, category, season_id")
      .eq("id", id)
      .maybeSingle()
    if (currentError) throw new Error(currentError.message)
    if (!current) return NextResponse.json({ success: false, message: "Equipo no encontrado" }, { status: 404 })

    const update: Record<string, any> = {}
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) update[field] = body[field]
    }
    if (update.paid !== undefined) update.paid = Boolean(update.paid)
    if (update.category !== undefined) update.category = normalizeCategory(update.category)
    if (update.name !== undefined) {
      update.name = String(update.name)
      if (!update.name.trim()) {
        return NextResponse.json({ success: false, message: "El nombre no puede ir vacío" }, { status: 400 })
      }
    }

    const renamed = update.name !== undefined && update.name !== current.name
    if (renamed) {
      const { data: clash } = await supabase
        .from("teams")
        .select("id")
        .eq("season_id", current.season_id)
        .eq("name", update.name)
        .neq("id", id)
        .limit(1)
      if (clash?.length) {
        return NextResponse.json(
          { success: false, message: `Ya existe otro equipo llamado "${update.name}" en esta temporada` },
          { status: 400 },
        )
      }
    }

    const { data: team, error } = await supabase.from("teams").update(update).eq("id", id).select().single()
    if (error) throw new Error(error.message)

    let renamedGames = 0
    if (renamed) {
      const [home, away] = await Promise.all([
        supabase
          .from("games")
          .update({ home_team: update.name }, { count: "exact" })
          .eq("season_id", current.season_id)
          .eq("home_team", current.name),
        supabase
          .from("games")
          .update({ away_team: update.name }, { count: "exact" })
          .eq("season_id", current.season_id)
          .eq("away_team", current.name),
      ])
      if (home.error) throw new Error(home.error.message)
      if (away.error) throw new Error(away.error.message)
      renamedGames = (home.count || 0) + (away.count || 0)
    }

    return NextResponse.json({ success: true, data: team, renamed_games: renamedGames })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
