import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 })
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar en la base de datos
    const { data, error } = await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("email", email)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, message: "No se encontró una cuenta con ese correo" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Contraseña restablecida correctamente" })
  } catch (error) {
    console.error("Error en reset password:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}