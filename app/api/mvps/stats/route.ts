import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    let seasonId = searchParams.get("season")
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }
    if (!seasonId) return NextResponse.json({ success: false, message: "No hay temporada activa." }, { status: 400 })

    console.log("MVP Stats API - Category filter:", category)

    // Query base para obtener estadísticas de MVPs
    let query = supabase.from("mvps").select(`
        player_id,
        mvp_type,
        category,
        created_at,
        players!mvps_player_id_fkey (
          id,
          name,
          photo_url,
          team_id,
          teams!players_team_id_fkey (
            id,
            name,
            logo_url,
            color1,
            color2,
            category
          )
        )
      `).eq("season_id", seasonId)

    // Aplicar filtro de categoría si se especifica
    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    const { data: mvpsData, error } = await query

    if (error) {
      console.error("Error fetching MVP stats:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    console.log("Raw MVPs data:", mvpsData?.length || 0, "records")

    // Procesar datos para crear estadísticas por jugador
    const playerStats = new Map()

    mvpsData?.forEach((mvp) => {
      const playerId = mvp.player_id
      const player = mvp.players

      if (!player) {
        console.log("MVP without player data:", mvp)
        return
      }

      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          player_id: playerId,
          player_name: player.name,
          team_name: player.teams?.name || "Sin equipo",
          team_logo: player.teams?.logo_url,
          team_color1: player.teams?.color1 || "#3B82F6",
          team_color2: player.teams?.color2 || "#1E40AF",
          photo_url: player.photo_url,
          mvp_count: 0,
          weighted_mvp_count: 0,
          categories: new Set(),
          latest_mvp_date: mvp.created_at,
          weekly_mvps: 0,
          game_mvps: 0,
        })
      }

      const stats = playerStats.get(playerId)
      stats.mvp_count += 1
      stats.categories.add(mvp.category)

      // Sistema de puntos ponderado: Semanal = 2 puntos, Juego = 1 punto
      if (mvp.mvp_type === "weekly") {
        stats.weekly_mvps += 1
        stats.weighted_mvp_count += 2
      } else {
        stats.game_mvps += 1
        stats.weighted_mvp_count += 1
      }

      // Actualizar fecha más reciente
      if (new Date(mvp.created_at) > new Date(stats.latest_mvp_date)) {
        stats.latest_mvp_date = mvp.created_at
      }
    })

    // Convertir a array y ordenar por puntos ponderados
    const result = Array.from(playerStats.values())
      .map((stats) => ({
        ...stats,
        categories: Array.from(stats.categories),
      }))
      .sort((a, b) => {
        // Ordenar por puntos ponderados (descendente), luego por MVPs totales
        if (b.weighted_mvp_count !== a.weighted_mvp_count) {
          return b.weighted_mvp_count - a.weighted_mvp_count
        }
        return b.mvp_count - a.mvp_count
      })

    console.log("Processed MVP stats:", result.length, "players")
    console.log("Sample result:", result[0])

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in MVP stats API:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
