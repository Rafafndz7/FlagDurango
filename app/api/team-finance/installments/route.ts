import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"

function getAuthUser(req: NextRequest) {
  try {
    return JSON.parse(req.cookies.get("auth-token")?.value || "{}")
  } catch {
    return null
  }
}

function isAdmin(req: NextRequest) {
  return getAuthUser(req)?.role === "admin"
}

async function ensureFinance(teamId: number, userId?: number | null) {
  const { data: existing } = await supabase
    .from("team_finance")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle()

  if (existing) return existing

  const { data: team } = await supabase.from("teams").select("season_id").eq("id", teamId).maybeSingle()
  const { data, error } = await supabase
    .from("team_finance")
    .insert({
      team_id: teamId,
      season_id: team?.season_id || null,
      registration_fee: 1900,
      status: "unpaid",
      updated_by: userId || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function recalcFinance(financeId: number) {
  const { data: finance } = await supabase
    .from("team_finance")
    .select("id, team_id, registration_fee")
    .eq("id", financeId)
    .single()

  if (!finance) return null

  const { data: installments } = await supabase
    .from("team_payment_installments")
    .select("amount")
    .eq("team_finance_id", financeId)

  const paidTotal = (installments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const fee = Number(finance.registration_fee || 1900)
  let status: "unpaid" | "partial" | "paid" = "unpaid"
  if (paidTotal <= 0) status = "unpaid"
  else if (paidTotal + 0.001 >= fee) status = "paid"
  else status = "partial"

  await supabase
    .from("team_finance")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", financeId)

  await supabase.from("teams").update({ paid: status === "paid" }).eq("id", finance.team_id)

  return { paidTotal, fee, status, remaining: Math.max(fee - paidTotal, 0) }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const teamId = Number(body.team_id)
    const amount = Number(body.amount)
    if (!teamId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "team_id y amount (>0) son requeridos" },
        { status: 400 },
      )
    }

    const user = getAuthUser(req)
    const finance = await ensureFinance(teamId, user?.id)

    const { data, error } = await supabase
      .from("team_payment_installments")
      .insert({
        team_finance_id: finance.id,
        amount,
        paid_at: body.paid_at || new Date().toISOString().slice(0, 10),
        payment_method: body.payment_method || null,
        held_by: body.held_by || null,
        note: body.note || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    const totals = await recalcFinance(finance.id)
    return NextResponse.json({ success: true, data, totals }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/team-finance/installments", error)
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))
    if (!id) {
      return NextResponse.json({ success: false, message: "id requerido" }, { status: 400 })
    }

    const { data: row, error: fetchError } = await supabase
      .from("team_payment_installments")
      .select("id, team_finance_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !row) {
      return NextResponse.json({ success: false, message: "Abono no encontrado" }, { status: 404 })
    }

    const { error } = await supabase.from("team_payment_installments").delete().eq("id", id)
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    const totals = await recalcFinance(row.team_finance_id)
    return NextResponse.json({ success: true, message: "Abono eliminado", totals })
  } catch (error) {
    console.error("DELETE /api/team-finance/installments", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}
