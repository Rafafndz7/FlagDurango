import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

export async function POST() {
  try {
    // Ejecutar el script de merge paso a paso

    // 1. Actualizar constraint
    const { error: constraintError } = await supabase.rpc("execute_sql", {
      sql: `
        ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_category_check;
        ALTER TABLE teams ADD CONSTRAINT teams_category_check 
        CHECK (category IS NULL OR category IN (
            'varonil-libre','varonil-gold','varonil-master','varonil-silver','varonil-cooper',
            'femenil-gold','femenil-silver','femenil-cooper','femenil-cooper-a','femenil-cooper-b',
            'mixto-gold','mixto-silver','mixto-cooper','mixto-recreativo',
            'teens','1v1'
        ));
      `,
    })

    if (constraintError) {
      console.error("Error updating constraint:", constraintError)
      // Continuar aunque falle el constraint
    }

    // 2. Actualizar equipos
    const { error: teamsError } = await supabase
      .from("teams")
      .update({ category: "varonil-libre" })
      .in("category", ["varonil-gold", "varonil-silver"])

    if (teamsError) {
      console.error("Error updating teams:", teamsError)
      return NextResponse.json(
        {
          success: false,
          message: "Error actualizando equipos: " + teamsError.message,
        },
        { status: 500 },
      )
    }

    // 3. Actualizar juegos
    const { error: gamesError } = await supabase
      .from("games")
      .update({ category: "varonil-libre" })
      .in("category", ["varonil-gold", "varonil-silver"])

    if (gamesError) {
      console.error("Error updating games:", gamesError)
      return NextResponse.json(
        {
          success: false,
          message: "Error actualizando juegos: " + gamesError.message,
        },
        { status: 500 },
      )
    }

    // 4. Actualizar MVPs si existen
    const { error: mvpsError } = await supabase
      .from("mvps")
      .update({ category: "varonil-libre" })
      .in("category", ["varonil-gold", "varonil-silver"])

    if (mvpsError) {
      console.log("MVPs update error (may not exist):", mvpsError)
      // No fallar si no existe la tabla MVPs
    }

    // 5. Obtener estadísticas finales
    const { data: teamsCount } = await supabase.from("teams").select("category").eq("category", "varonil-libre")

    const { data: gamesCount } = await supabase.from("games").select("category").eq("category", "varonil-libre")

    return NextResponse.json({
      success: true,
      message: "Categorías varoniles fusionadas exitosamente",
      data: {
        equipos_actualizados: teamsCount?.length || 0,
        juegos_actualizados: gamesCount?.length || 0,
      },
    })
  } catch (error: any) {
    console.error("Error merging categories:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno: " + error.message,
      },
      { status: 500 },
    )
  }
}
