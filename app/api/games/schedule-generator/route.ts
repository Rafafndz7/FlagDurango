import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import { requireSeasonId } from "@/lib/seasons"
import {
  SCHEDULE_FIELDS,
  formatFieldName,
  getAllowedHours,
  isHourAllowedForCategory,
  makeSlotKey,
  normalizeFieldLetter,
} from "@/lib/schedule-slots"

function isAdmin(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

type MatchInput = {
  home_team: string
  away_team: string
  category: string
  game_time?: string
  field?: string
  allow_shared_slot?: boolean
  draft_notes?: string
}

async function resolveSeason(requested?: string | null) {
  if (requested) return requireSeasonId(requested)
  const { data } = await supabase.from("seasons").select("id, year").eq("is_active", true).maybeSingle()
  if (!data) throw new Error("No hay temporada activa")
  return data.id
}

/** GET: grid de ocupación + drafts del día */
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const seasonId = await resolveSeason(searchParams.get("season"))
    const draftsOnly = searchParams.get("drafts") === "1"

    let query = supabase
      .from("games")
      .select(
        "id, home_team, away_team, game_date, game_time, venue, field, category, status, is_draft, allow_shared_slot, draft_notes, jornada, season_id",
      )
      .eq("season_id", seasonId)
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true })

    // game_date es tipo DATE → filtrar con YYYY-MM-DD (no timestamptz)
    if (date) query = query.eq("game_date", date.slice(0, 10))
    if (draftsOnly) query = query.eq("is_draft", true)

    const { data, error } = await query
    if (error) {
      // Columna is_draft puede no existir aún
      if (/is_draft|does not exist/i.test(error.message)) {
        return NextResponse.json({
          success: false,
          message:
            "Falta migrar la BD. Ejecuta scripts/2026-09-schedule-drafts.sql en Supabase.",
          needs_migration: true,
        }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    const games = (data || []).map((g) => ({
      ...g,
      game_date: g.game_date?.toString().slice(0, 10),
      game_time: g.game_time ? String(g.game_time).slice(0, 5) : null,
      field_letter: normalizeFieldLetter(g.field),
      slot_key: makeSlotKey(
        g.game_date?.toString() || "",
        g.game_time || "",
        g.field || "",
      ),
    }))

    const occupied: Record<string, typeof games> = {}
    for (const g of games) {
      const key = g.slot_key
      if (!occupied[key]) occupied[key] = []
      occupied[key].push(g)
    }

    return NextResponse.json({
      success: true,
      data: games,
      occupied,
      fields: SCHEDULE_FIELDS.map((f) => formatFieldName(f)),
      season_id: seasonId,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/** POST: generar borradores en lote */
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const gameDate = String(body.game_date || "").slice(0, 10)
    const venue = body.venue || "Deportivo Tapias"
    const jornada = body.jornada || null
    const matches: MatchInput[] = body.matches || []
    const autoAssign = body.auto_assign !== false
    const asDraft = body.as_draft !== false // default draft

    if (!gameDate || matches.length === 0) {
      return NextResponse.json(
        { success: false, message: "game_date y matches[] son requeridos" },
        { status: 400 },
      )
    }

    const seasonId = await resolveSeason(body.season_id)
    const { data: season } = await supabase.from("seasons").select("year").eq("id", seasonId).single()

    // Cargar ocupación existente del día
    const { data: existing } = await supabase
      .from("games")
      .select("id, home_team, away_team, game_time, field, category, is_draft, allow_shared_slot")
      .eq("season_id", seasonId)
      .eq("game_date", gameDate)

    const slotUsage = new Map<string, { count: number; allowShare: boolean; games: any[] }>()
    for (const g of existing || []) {
      const key = makeSlotKey(gameDate, g.game_time || "", g.field || "")
      const cur = slotUsage.get(key) || { count: 0, allowShare: false, games: [] }
      cur.count += 1
      cur.allowShare = cur.allowShare || !!g.allow_shared_slot
      cur.games.push(g)
      slotUsage.set(key, cur)
    }

    // Round-robin de campos/horas por bloque
    const blockPointers: Record<string, { hourIdx: number; fieldIdx: number }> = {}

    const rows: any[] = []
    const warnings: string[] = []

    for (const m of matches) {
      if (!m.home_team || !m.away_team || !m.category) {
        warnings.push(`Partido incompleto omitido: ${JSON.stringify(m)}`)
        continue
      }
      if (m.home_team === m.away_team) {
        warnings.push(`Mismo equipo en ambos lados: ${m.home_team}`)
        continue
      }

      let time = m.game_time ? String(m.game_time).slice(0, 5) : ""
      let fieldLetter = m.field ? normalizeFieldLetter(m.field) : ""

      if (autoAssign && (!time || !fieldLetter)) {
        const hours = getAllowedHours(m.category)
        if (hours.length === 0) {
          warnings.push(`Sin bloque horario para categoría ${m.category} (${m.home_team})`)
          continue
        }
        const blockKey = hours.join("-")
        if (!blockPointers[blockKey]) blockPointers[blockKey] = { hourIdx: 0, fieldIdx: 0 }

        // Buscar primer slot libre (o compartible)
        let placed = false
        for (let attempt = 0; attempt < hours.length * SCHEDULE_FIELDS.length; attempt++) {
          const ptr = blockPointers[blockKey]
          const h = hours[ptr.hourIdx % hours.length]
          const f = SCHEDULE_FIELDS[ptr.fieldIdx % SCHEDULE_FIELDS.length]
          const key = makeSlotKey(gameDate, h, f)
          const usage = slotUsage.get(key)

          const canShare = m.allow_shared_slot || usage?.allowShare
          if (!usage || usage.count === 0 || (canShare && usage.count < 2)) {
            time = h
            fieldLetter = f
            placed = true
            // avanzar puntero
            ptr.fieldIdx += 1
            if (ptr.fieldIdx >= SCHEDULE_FIELDS.length) {
              ptr.fieldIdx = 0
              ptr.hourIdx += 1
            }
            break
          }
          ptr.fieldIdx += 1
          if (ptr.fieldIdx >= SCHEDULE_FIELDS.length) {
            ptr.fieldIdx = 0
            ptr.hourIdx += 1
          }
        }
        if (!placed) {
          warnings.push(
            `Sin campo libre para ${m.home_team} vs ${m.away_team} en horas ${hours.join("/")}. Asigna manual o marca compartir cupo.`,
          )
          continue
        }
      }

      if (!time || !fieldLetter) {
        warnings.push(`Falta hora/campo: ${m.home_team} vs ${m.away_team}`)
        continue
      }

      if (!isHourAllowedForCategory(m.category, time) && !m.allow_shared_slot) {
        warnings.push(
          `Hora ${time} fuera de bloque para ${m.category} (${m.home_team}). Se guarda igual (ajuste manual).`,
        )
      }

      const key = makeSlotKey(gameDate, time, fieldLetter)
      const usage = slotUsage.get(key)
      if (usage && usage.count >= 1 && !(m.allow_shared_slot || usage.allowShare)) {
        warnings.push(
          `Conflicto ${key}: ya está ${usage.games.map((g) => g.home_team).join(",")}. Marca compartir o cambia horario.`,
        )
        if (!body.force) continue
      }

      const fieldName = formatFieldName(fieldLetter)
      rows.push({
        home_team: m.home_team,
        away_team: m.away_team,
        category: m.category,
        game_date: gameDate,
        game_time: time,
        venue,
        field: fieldName,
        status: "programado",
        match_type: body.match_type || "jornada",
        jornada,
        stage: "regular",
        sport_type: "flag",
        game_type: body.game_type || "regular",
        counts_for_standings: (body.game_type || "regular") === "regular",
        season_id: seasonId,
        season: season?.year ? String(season.year) : null,
        is_draft: asDraft,
        allow_shared_slot: !!m.allow_shared_slot,
        draft_notes: m.draft_notes || null,
      })

      const cur = slotUsage.get(key) || { count: 0, allowShare: false, games: [] }
      cur.count += 1
      cur.allowShare = cur.allowShare || !!m.allow_shared_slot
      cur.games.push({ home_team: m.home_team })
      slotUsage.set(key, cur)
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No se generó ningún partido",
        warnings,
      }, { status: 400 })
    }

    const { data, error } = await supabase.from("games").insert(rows).select()
    if (error) {
      if (/is_draft|does not exist/i.test(error.message)) {
        return NextResponse.json({
          success: false,
          message: "Ejecuta scripts/2026-09-schedule-drafts.sql en Supabase antes de generar drafts.",
          needs_migration: true,
        }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      created: data?.length || 0,
      as_draft: asDraft,
      warnings,
      message: asDraft
        ? `${data?.length || 0} partidos en borrador. Publícalos cuando estén aceptados.`
        : `${data?.length || 0} partidos publicados.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error("POST schedule-generator", error)
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}

/** PUT: publicar drafts / ajustar horario / mover */
export async function PUT(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const action = body.action as string

    if (action === "publish") {
      const ids: number[] = (body.ids || []).map(Number).filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ success: false, message: "ids[] requerido" }, { status: 400 })
      }
      const { data, error } = await supabase
        .from("games")
        .update({ is_draft: false, status: "programado" })
        .in("id", ids)
        .select()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({
        success: true,
        data,
        message: `${data?.length || 0} partidos publicados en el calendario.`,
      })
    }

    if (action === "unpublish") {
      const ids: number[] = (body.ids || []).map(Number).filter(Boolean)
      const { data, error } = await supabase
        .from("games")
        .update({ is_draft: true })
        .in("id", ids)
        .select()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data, message: "Devueltos a borrador" })
    }

    if (action === "adjust") {
      const id = Number(body.id)
      if (!id) return NextResponse.json({ success: false, message: "id requerido" }, { status: 400 })
      const patch: Record<string, unknown> = {}
      if (body.game_time) patch.game_time = String(body.game_time).slice(0, 5)
      if (body.field) patch.field = formatFieldName(normalizeFieldLetter(body.field) || body.field)
      if (body.game_date) patch.game_date = String(body.game_date).slice(0, 10)
      if (body.venue !== undefined) patch.venue = body.venue
      if (body.allow_shared_slot !== undefined) patch.allow_shared_slot = !!body.allow_shared_slot
      if (body.draft_notes !== undefined) patch.draft_notes = body.draft_notes
      if (body.home_team) patch.home_team = body.home_team
      if (body.away_team) patch.away_team = body.away_team

      const { data, error } = await supabase.from("games").update(patch).eq("id", id).select().single()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (action === "publish_all_drafts_for_date") {
      const date = String(body.game_date || "").slice(0, 10)
      const seasonId = await resolveSeason(body.season_id)
      if (!date) return NextResponse.json({ success: false, message: "game_date requerido" }, { status: 400 })
      const { data, error } = await supabase
        .from("games")
        .update({ is_draft: false, status: "programado" })
        .eq("season_id", seasonId)
        .eq("game_date", date)
        .eq("is_draft", true)
        .select()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({
        success: true,
        data,
        message: `${data?.length || 0} borradores del ${date} publicados.`,
      })
    }

    if (action === "publish_all_drafts") {
      const seasonId = await resolveSeason(body.season_id)
      const { data, error } = await supabase
        .from("games")
        .update({ is_draft: false, status: "programado" })
        .eq("season_id", seasonId)
        .eq("is_draft", true)
        .select()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      return NextResponse.json({
        success: true,
        data,
        message: `${data?.length || 0} borradores publicados.`,
      })
    }

    return NextResponse.json({ success: false, message: "action inválida" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error" }, { status: 500 })
  }
}
