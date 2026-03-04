import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp" // <-- Importamos la librería de compresión

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

    // Validar tamaño inicial (max 5MB por si intentan subir archivos masivos)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "El archivo es muy grande. Máximo 5MB antes de compresión." },
        { status: 400 }
      )
    }

    // Convertir el archivo a un formato que Supabase entienda (Buffer)
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    
    let contentType = file.type
    let extension = file.name.split(".").pop()

    // 👇 MAGIA DE COMPRESIÓN (Ignoramos los SVG porque ya son vectores ligeros) 👇
    if (file.type !== "image/svg+xml") {
      buffer = await sharp(buffer)
        .resize(800, 800, { 
          fit: 'inside', 
          withoutEnlargement: true // No hace más grandes las imágenes pequeñas
        }) 
        .webp({ quality: 80 }) // Convertir a WebP con 80% de calidad (Súper ligero sin perder nitidez)
        .toBuffer();
      
      // Actualizamos el tipo y extensión porque ahora es WebP
      contentType = "image/webp";
      extension = "webp";
    }

    // Generar nombre único
    const timestamp = Date.now()
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

    // 1. Subir a Supabase Storage (al bucket 'uploads')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: contentType,
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
      url: publicUrl, // Este es el link optimizado que irá a tu base de datos
      message: "Archivo subido y comprimido exitosamente",
    })
    
  } catch (error) {
    console.error("Error upload:", error)
    return NextResponse.json(
      { success: false, message: "Error interno al subir la imagen" },
      { status: 500 }
    )
  }
}