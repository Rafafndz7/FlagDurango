import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ success: false, message: "ID de usuario requerido" }, { status: 400 })
    }

    // Hacemos "Soft Delete": Cambiamos el status a inactivo y ocultamos el email
    // Así cumplimos con Apple/Google sin romper la base de datos de la liga
    const { error } = await supabase
      .from("users")
      .update({ 
        status: 'inactive',
        email: `eliminado_${user_id}_${Date.now()}@borrado.com`
      })
      .eq("id", user_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Cuenta eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar cuenta:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}