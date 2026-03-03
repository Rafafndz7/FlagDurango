import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { user_id, token } = await request.json()

    if (!user_id || !token) {
      return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ expo_push_token: token })
      .eq("id", user_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Token guardado" })
  } catch (error) {
    console.error("Error guardando token:", error)
    return NextResponse.json({ success: false, message: "Error del servidor" }, { status: 500 })
  }
}