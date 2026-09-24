import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

function isAdmin(request: NextRequest) {
  try {
    return JSON.parse(request.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, role, status, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error("Error in users GET:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, password, role } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Nombre de usuario, email y contraseña son requeridos",
        },
        { status: 400 },
      )
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "El usuario o email ya existe",
        },
        { status: 400 },
      )
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const { data: user, error } = await supabase
      .from("users")
      .insert([
        {
          username,
          email,
          password_hash: passwordHash,
          role: role || "user",
          status: "active",
        },
      ])
      .select("id, username, email, role, status, created_at")
      .single()

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Error in users POST:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, message: "Solo administradores" }, { status: 403 })
    }

    const body = await request.json()
    const { id, role, status } = body

    if (!id || (!role && !status)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID y al menos un campo (rol o estado) son requeridos",
        },
        { status: 400 },
      )
    }

    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (status) updateData.status = status

    const { data: user, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, username, email, role, status, created_at")
      .single()

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Error in users PUT:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
