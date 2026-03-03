import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Conectamos con tu Supabase usando las variables de entorno que ya tienes en tu proyecto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Usamos el Service Role para tener permisos de escritura directos desde el servidor
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string || "logos"

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No se proporcionó archivo" },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Tipo de archivo no permitido. Solo JPG, PNG, WebP y SVG" },
        { status: 400 }
      )
    }

    // Validar tamaño (max 5MB es ideal para logos)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "El archivo es muy grande. Máximo 5MB" },
        { status: 400 }
      )
    }

    // Convertir el archivo a un formato que Supabase entienda (Buffer)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generar nombre único
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

    // 1. Subir a Supabase Storage (al bucket 'uploads' que acabamos de crear)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Error de Supabase:", uploadError)
      throw new Error("No se pudo subir a Supabase")
    }

    // 2. Obtener el Link Público permanente
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filename)

    return NextResponse.json({
      success: true,
      url: publicUrl, // Este es el link hermoso que irá a tu base de datos
      message: "Archivo subido exitosamente a Supabase",
    })
    
  } catch (error) {
    console.error("Error upload:", error)
    return NextResponse.json(
      { success: false, message: "Error interno al subir la imagen" },
      { status: 500 }
    )
  }
}
