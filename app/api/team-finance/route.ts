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

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const seasonIdParam = searchParams.get("season")

    let seasonId = seasonIdParam
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id || null
    }

    let teamsQuery = supabase
      .from("teams")
      .select("id, name, category, paid, season_id, coach_name, captain_name, logo_url")
      .order("name", { ascending: true })

    if (seasonId) teamsQuery = teamsQuery.eq("season_id", seasonId)

    const { data: teams, error: teamsError } = await teamsQuery
    if (teamsError) {
      return NextResponse.json({ success: false, message: teamsError.message }, { status: 500 })
    }

    const teamIds = (teams || []).map((t) => t.id)
    let finances: any[] = []
    if (teamIds.length > 0) {
      const { data } = await supabase
        .from("team_finance")
        .select("*, team_payment_installments(*)")
        .in("team_id", teamIds)
      finances = data || []
    }

    const financeByTeam = new Map(finances.map((f) => [f.team_id, f]))

    const rows = (teams || []).map((team) => {
      const finance = financeByTeam.get(team.id)
      const installments = finance?.team_payment_installments || []
      const paidTotal = installments.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
      const fee = Number(finance?.registration_fee ?? 1900)
      const status =
        finance?.status ||
        (team.paid ? "paid" : paidTotal > 0 ? "partial" : "unpaid")

      return {
        team,
        finance: finance
          ? {
              id: finance.id,
              team_id: finance.team_id,
              season_id: finance.season_id,
              registration_fee: fee,
              status,
              notes: finance.notes,
              updated_at: finance.updated_at,
            }
          : {
              id: null,
              team_id: team.id,
              season_id: seasonId,
              registration_fee: 1900,
              status: team.paid ? "paid" : "unpaid",
              notes: null,
              updated_at: null,
            },
        paid_total: paidTotal,
        remaining: Math.max(fee - paidTotal, 0),
        installments: installments.sort(
          (a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
        ),
      }
    })

    return NextResponse.json({ success: true, data: rows, season_id: seasonId })
  } catch (error) {
    console.error("GET /api/team-finance", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const teamId = Number(body.team_id)
    if (!teamId) {
      return NextResponse.json({ success: false, message: "team_id requerido" }, { status: 400 })
    }

    const user = getAuthUser(req)
    let seasonId = body.season_id
    if (!seasonId) {
      const { data: team } = await supabase.from("teams").select("season_id").eq("id", teamId).maybeSingle()
      seasonId = team?.season_id
    }
    if (!seasonId) {
      const { data: active } = await supabase.from("seasons").select("id").eq("is_active", true).maybeSingle()
      seasonId = active?.id
    }

    const { data: existing } = await supabase
      .from("team_finance")
      .select("id")
      .eq("team_id", teamId)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from("team_finance")
        .update({
          registration_fee: body.registration_fee ?? 1900,
          notes: body.notes ?? null,
          season_id: seasonId,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      await recalcFinance(existing.id)
      return NextResponse.json({ success: true, data })
    }

    const { data, error } = await supabase
      .from("team_finance")
      .insert({
        team_id: teamId,
        season_id: seasonId,
        registration_fee: body.registration_fee ?? 1900,
        notes: body.notes ?? null,
        status: "unpaid",
        updated_by: user?.id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error("POST /api/team-finance", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const teamId = Number(body.team_id)
    if (!teamId) {
      return NextResponse.json({ success: false, message: "team_id requerido" }, { status: 400 })
    }

    const user = getAuthUser(req)

    let { data: finance } = await supabase
      .from("team_finance")
      .select("*")
      .eq("team_id", teamId)
      .maybeSingle()

    if (!finance) {
      const { data: team } = await supabase.from("teams").select("season_id").eq("id", teamId).maybeSingle()
      const insert = await supabase
        .from("team_finance")
        .insert({
          team_id: teamId,
          season_id: team?.season_id || body.season_id || null,
          registration_fee: body.registration_fee ?? 1900,
          notes: body.notes ?? null,
          status: "unpaid",
          updated_by: user?.id || null,
        })
        .select()
        .single()
      if (insert.error) {
        return NextResponse.json({ success: false, message: insert.error.message }, { status: 500 })
      }
      finance = insert.data
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    }
    if (body.registration_fee !== undefined) patch.registration_fee = Number(body.registration_fee)
    if (body.notes !== undefined) patch.notes = body.notes

    // Marcar pagado completo: abonar el restante
    if (body.mark_paid === true) {
      const totals = await recalcFinance(finance.id)
      const remaining = totals?.remaining ?? Number(finance.registration_fee || 1900)
      if (remaining > 0.001) {
        await supabase.from("team_payment_installments").insert({
          team_finance_id: finance.id,
          amount: remaining,
          paid_at: new Date().toISOString().slice(0, 10),
          payment_method: body.payment_method || "ajuste",
          held_by: body.held_by || "Admin",
          note: body.note || "Marcado como pagado completo",
          created_by: user?.id || null,
        })
      }
    }

    const { data, error } = await supabase
      .from("team_finance")
      .update(patch)
      .eq("id", finance.id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    const totals = await recalcFinance(finance.id)
    return NextResponse.json({ success: true, data, totals })
  } catch (error) {
    console.error("PUT /api/team-finance", error)
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 })
  }
}
