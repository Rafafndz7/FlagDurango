import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase" // Ajusta esta ruta si tu archivo de supabase está en otro lado

export async function GET() {
  try {
    const { data, error } = await supabase.from("arbitraje_payments").select("*")
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error cargando pagos de arbitraje" })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Usamos upsert para actualizar si ya existe o crear si es nuevo
    const { data, error } = await supabase
      .from("arbitraje_payments")
      .upsert({
        game_id: body.game_id,
        home_paid: body.home_paid || false,
        away_paid: body.away_paid || false,
        paramedics_pay: body.paramedics_pay,
        referee1_pay: body.referee1_pay || 0,
        referee2_pay: body.referee2_pay || 0,
      }, { onConflict: 'game_id' })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error guardando pago de arbitraje" })
  }
}