import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, password, role, playerName, position, jerseyNumber } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Todos los campos son requeridos." },
        { status: 400 },
      )
    }

    const finalRole = role === "player" ? "player" : "coach"

    // Validate player-specific fields
    if (finalRole === "player") {
      if (!playerName || !playerName.trim()) {
        return NextResponse.json(
          { success: false, message: "El nombre completo es requerido para jugadores." },
          { status: 400 },
        )
      }
      if (!jerseyNumber || jerseyNumber < 1 || jerseyNumber > 99) {
        return NextResponse.json(
          { success: false, message: "El numero de jersey debe ser entre 1 y 99." },
          { status: 400 },
        )
      }
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, message: "El usuario o email ya existe." },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{
        username,
        email,
        password_hash: passwordHash,
        role: finalRole,
        status: "active",
      }])
      .select()
      .single()

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json(
        { success: false, message: "Error al crear el usuario." },
        { status: 500 },
      )
    }

    // If player, also create a player record (without team_id)
    if (finalRole === "player") {
      const { error: playerError } = await supabase
        .from("players")
        .insert([{
          name: playerName.trim(),
          position: position || "QB",
          jersey_number: parseInt(String(jerseyNumber), 10),
          user_id: newUser.id,
          // team_id is null - they will request to join a team later
        }])

      if (playerError) {
        console.error("Error creating player record:", playerError)
        // Rollback: delete the user we just created
        await supabase.from("users").delete().eq("id", newUser.id)
        return NextResponse.json(
          { success: false, message: "Error al crear el perfil de jugador: " + playerError.message },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: finalRole === "player"
        ? "Cuenta de jugador creada exitosamente. Ya puedes iniciar sesion y solicitar unirte a un equipo."
        : "Usuario registrado exitosamente. Ya puedes iniciar sesion.",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { success: false, message: "Error interno del servidor." },
      { status: 500 },
    )
  }
}
