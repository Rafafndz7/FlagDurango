import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    // Ahora también recibimos el "code" desde la App Móvil
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 });
    }

    // 1. Buscar al usuario y traer su código guardado
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, reset_code, reset_code_expires_at")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 });
    }

    // 2. Verificar que el código ingresado coincida con el de la base de datos
    if (user.reset_code !== code) {
      return NextResponse.json({ success: false, message: "El código de seguridad es incorrecto" }, { status: 400 });
    }

    // 3. Verificar que el código no haya expirado (pasaron más de 15 min)
    if (new Date(user.reset_code_expires_at) < new Date()) {
      return NextResponse.json({ success: false, message: "El código ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    // 4. Si todo es correcto, hasheamos la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Actualizar en la base de datos (y borrar el código por seguridad)
    const { error: updateError } = await supabase
      .from("users")
      .update({ 
        password_hash: hashedPassword,
        reset_code: null, // Limpiamos el código
        reset_code_expires_at: null // Limpiamos la fecha
      })
      .eq("email", email);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: "Contraseña restablecida correctamente" });
  } catch (error) {
    console.error("Error en reset password:", error);
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 });
  }
}