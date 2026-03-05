import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Falta el correo" }, { status: 400 });
    }

    // 1. Verificar si el usuario existe
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, message: "No se encontró una cuenta con ese correo" }, { status: 404 });
    }

    // 2. Generar un código de 6 dígitos aleatorio
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Ej. "482915"

    // 3. Crear fecha de expiración (15 minutos a partir de ahora)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 4. Guardar el código en la base de datos
    const { error: updateError } = await supabase
      .from("users")
      .update({
        reset_code: otpCode,
        reset_code_expires_at: expiresAt
      })
      .eq("email", email);

    if (updateError) {
      throw updateError;
    }

    // --------------------------------------------------------------------------------
    // 5. 📧 ENVIAR EL CORREO ELECTRÓNICO
    // NOTA: Aquí debes integrar tu servicio de correos (Resend, SendGrid, Nodemailer)
    // Por ahora, lo imprimiremos en la consola del servidor para que puedas probar la app
    // --------------------------------------------------------------------------------
    console.log(`\n========================================`);
    console.log(`🔐 CÓDIGO DE RECUPERACIÓN FLAG DURANGO`);
    console.log(`Para: ${email}`);
    console.log(`CÓDIGO: ${otpCode}`);
    console.log(`========================================\n`);

    return NextResponse.json({ success: true, message: "Código enviado" });
  } catch (error) {
    console.error("Error en request-password-reset:", error);
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 });
  }
}