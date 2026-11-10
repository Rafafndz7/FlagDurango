import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function isAdmin(request: NextRequest) {
  try {
    return JSON.parse(request.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

type ImportGame = {
  time: string
  field: string
  category: string
  home_team: string
  away_team: string
  friendly?: boolean
}

const LOCKED_STATUSES = new Set(["en vivo", "en_vivo", "finalizado"])

/**
 * Publica una jornada completa desde el importador de rol (Excel / Google Sheets).
 * Reemplaza los partidos de esa jornada y fecha en la temporada activa, salvo que
 * alguno ya esté en vivo o finalizado.
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ success: false, message: "Solo administradores." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const jornada = Number(body.jornada)
    const date = String(body.date || "").slice(0, 10)
    const venue = String(body.venue || "").trim() || null
    const isDraft = body.is_draft === true
    const games: ImportGame[] = Array.isArray(body.games) ? body.games : []

    if (!Number.isInteger(jornada) || jornada <= 0) {
      return NextResponse.json({ success: false, message: "Número de jornada inválido." }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, message: "Fecha inválida." }, { status: 400 })
    }
    if (games.length === 0) {
      return NextResponse.json({ success: false, message: "No hay partidos para publicar." }, { status: 400 })
    }
    for (const g of games) {
      if (!g.time || !g.field || !g.category || !g.home_team || !g.away_team) {
        return NextResponse.json({ success: false, message: "Hay partidos incompletos." }, { status: 400 })
      }
      if (g.home_team.trim() === g.away_team.trim()) {
        return NextResponse.json(
          { success: false, message: `${g.home_team} no puede jugar contra sí mismo (${g.time} ${g.field}).` },
          { status: 400 },
        )
      }
    }

    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id, year")
      .eq("is_active", true)
      .maybeSingle()
    if (seasonError || !season) {
      return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })
    }

    const names = Array.from(new Set(games.flatMap((g) => [g.home_team, g.away_team])))
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("name")
      .eq("season_id", season.id)
      .in("name", names)
    if (teamsError) {
      return NextResponse.json({ success: false, message: teamsError.message }, { status: 500 })
    }
    const known = new Set((teams || []).map((t) => t.name))
    const missing = names.filter((n) => !known.has(n))
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Estos equipos no existen en la temporada activa: ${missing.join(", ")}` },
        { status: 400 },
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from("games")
      .select("id, status")
      .eq("season_id", season.id)
      .eq("jornada", jornada)
      .gte("game_date", `${date}T00:00:00Z`)
      .lte("game_date", `${date}T23:59:59Z`)
    if (existingError) {
      return NextResponse.json({ success: false, message: existingError.message }, { status: 500 })
    }
    if ((existing || []).some((g) => LOCKED_STATUSES.has(String(g.status)))) {
      return NextResponse.json(
        {
          success: false,
          message: `La J${jornada} ya tiene partidos en vivo o finalizados; no se reemplazó nada.`,
        },
        { status: 409 },
      )
    }

    const existingIds = (existing || []).map((g) => g.id)

    const rows = games.map((g) => ({
      home_team: g.home_team,
      away_team: g.away_team,
      game_date: `${date}T00:00:00Z`,
      game_time: g.time,
      venue,
      field: g.field,
      category: g.category,
      status: "programado",
      match_type: g.friendly ? "amistoso" : "jornada",
      jornada,
      stage: "regular",
      sport_type: "flag",
      game_type: g.friendly ? "friendly" : "regular",
      counts_for_standings: !g.friendly,
      season_id: season.id,
      season: String(season.year || ""),
      is_draft: isDraft,
    }))

    let { data: inserted, error: insertError } = await supabase.from("games").insert(rows).select("id")
    if (insertError && /is_draft/i.test(insertError.message)) {
      const retry = await supabase
        .from("games")
        .insert(rows.map(({ is_draft: _drop, ...rest }) => rest))
        .select("id")
      inserted = retry.data
      insertError = retry.error
    }
    if (insertError) {
      return NextResponse.json({ success: false, message: insertError.message }, { status: 500 })
    }

    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase.from("games").delete().in("id", existingIds)
      if (deleteError) {
        return NextResponse.json(
          {
            success: false,
            message: `Se publicó la jornada pero no se pudieron borrar ${existingIds.length} partidos anteriores: ${deleteError.message}`,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: { deleted: existingIds.length, inserted: inserted?.length || 0 },
    })
  } catch (error: any) {
    console.error("POST /api/games/import-rol error:", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
