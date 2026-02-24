import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Función para generar contraseña aleatoria
function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Función para generar email basado en nombre
function generateEmail(name: string, teamName: string): string {
  const cleanName = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
  const cleanTeam = teamName.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
  const random = Math.random().toString(36).substring(2, 6)
  return `${cleanName}.${cleanTeam}.${random}@flagdurango.player`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { player_id, coach_user_id, email: manualEmail, password: manualPassword } = body

    console.log("📝 Coach registrando cuenta para jugador:", { player_id, coach_user_id })

    if (!player_id || !coach_user_id) {
      return NextResponse.json(
        { success: false, message: "ID del jugador y del coach son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el coach existe y tiene rol de coach
    const { data: coach, error: coachError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", coach_user_id)
      .single()

    if (coachError || !coach || (coach.role !== "coach" && coach.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para crear cuentas de jugadores" },
        { status: 403 }
      )
    }

    // Obtener datos del jugador
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select(`
        id,
        name,
        user_id,
        team_id,
        teams!players_team_id_fkey (
          id,
          name
        )
      `)
      .eq("id", player_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { success: false, message: "Jugador no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si el jugador ya tiene cuenta
    if (player.user_id) {
      return NextResponse.json(
        { success: false, message: "Este jugador ya tiene una cuenta asignada" },
        { status: 400 }
      )
    }

    const teamName = (player.teams as any)?.name || "team"
    
    // Usar email/password manual si el coach los proporcionó, sino generar automáticamente
    const finalEmail = manualEmail && manualEmail.trim() ? manualEmail.trim() : generateEmail(player.name, teamName)
    const finalPassword = manualPassword && manualPassword.trim() ? manualPassword.trim() : generatePassword(8)

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(finalPassword, 12)

    // Crear usuario para el jugador
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        username: finalEmail.split("@")[0],
        email: finalEmail,
        password_hash: hashedPassword,
        role: "player",
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (userError) {
      console.error("❌ Error creando usuario del jugador:", userError)
      return NextResponse.json(
        { success: false, message: "Error al crear la cuenta: " + userError.message },
        { status: 500 }
      )
    }

    // Actualizar el jugador con el user_id
    const { error: updateError } = await supabase
      .from("players")
      .update({ user_id: newUser.id })
      .eq("id", player_id)

    if (updateError) {
      console.error("Error vinculando jugador con usuario:", updateError)
      // Eliminar el usuario creado si falla la vinculacion
      await supabase.from("users").delete().eq("id", newUser.id)
      return NextResponse.json(
        { success: false, message: "Error al vincular la cuenta con el jugador" },
        { status: 500 }
      )
    }

    // Propagate user_id to ALL other player rows with the same name
    // (e.g. player was added by coaches to multiple teams before getting an account)
    const { error: propagateError } = await supabase
      .from("players")
      .update({ user_id: newUser.id })
      .ilike("name", player.name.trim())
      .is("user_id", null)

    if (propagateError) {
      console.error("Warning: could not propagate user_id to other player rows:", propagateError)
      // Non-fatal: the primary row is already linked
    }

    console.log("✅ Cuenta de jugador creada exitosamente:", newUser.id)

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
      data: {
        player_id: player.id,
        player_name: player.name,
        email: finalEmail,
        password: finalPassword, // Solo se muestra una vez al coach
        user_id: newUser.id,
      },
    })
  } catch (error: any) {
    console.error("💥 Error en registro de jugador:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor: " + error.message },
      { status: 500 }
    )
  }
}
