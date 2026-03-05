import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { Resend } from 'resend';

// Inicializamos Resend fuera de la función POST
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Falta el correo" }, { status: 400 });
    }

    // 1. Verificar si el usuario existe
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        message: "No se encontró una cuenta con ese correo" 
      }, { status: 404 });
    }

    // 2. Generar un código de 6 dígitos aleatorio
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Crear fecha de expiración (15 minutos)
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
      console.error("Error en DB:", updateError);
      throw new Error("Error al guardar el código de seguridad");
    }

    // 5. Enviar el correo con Resend
    // Nota: Si usas el dominio gratuito de Resend, el "from" debe ser 'onboarding@resend.dev'
    // Si ya configuraste tu dominio, usa 'soporte@flagdurango.com.mx'
    const { error: mailError } = await resend.emails.send({
      from: 'Flag Durango <onboarding@resend.dev>', 
      to: email,
      subject: 'Código de Recuperación 🏈 - Flag Durango',
      html: `
        <div style="font-family: sans-serif; padding: 30px; text-align: center; background-color: #f8fafc;">
          <div style="background-color: #ffffff; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Recuperación de Contraseña</h2>
            <p style="color: #64748b;">Hola <strong>${user.username || 'Jugador'}</strong>,</p>
            <p style="color: #64748b;">Tu código de seguridad para Flag Durango es:</p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <h1 style="font-size: 32px; color: #FF6B1A; letter-spacing: 8px; margin: 0;">${otpCode}</h1>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Este código expira en 15 minutos.<br>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        </div>
      `
    });

    if (mailError) {
      console.error("Error de Resend:", mailError);
      return NextResponse.json({ success: false, message: "Error al enviar el correo" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Código enviado correctamente" });

  } catch (error: any) {
    console.error("Error en request-password-reset:", error);
    return NextResponse.json({ success: false, message: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
