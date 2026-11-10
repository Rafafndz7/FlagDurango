import { type NextRequest, NextResponse } from "next/server"
import { ROL_IMAGE_COLORS } from "@/lib/rol-import"

export const maxDuration = 60

function isAdmin(request: NextRequest) {
  try {
    return JSON.parse(request.cookies.get("auth-token")?.value || "{}").role === "admin"
  } catch {
    return false
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash"

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Texto del encabezado tal cual, ej. 'Jornada 8: 8 de Noviembre. Deportivo Tapias'" },
    fields: { type: "array", items: { type: "string" }, description: "Encabezados de columna de los campos en orden, ej. ['Campo A','Campo B']" },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          time: { type: "string", description: "Hora de la fila tal cual, ej. '8:00 AM'" },
          cells: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", description: "Encabezado del campo de esa columna, igual que en fields" },
                text: { type: "string", description: "Texto exacto de la celda, ej. 'AZT vs ITS' o 'BR COPPER vs TB SILVER'" },
                color: { type: "string", enum: Object.keys(ROL_IMAGE_COLORS), description: "Color de fondo de la celda" },
              },
              required: ["field", "text", "color"],
            },
          },
        },
        required: ["time", "cells"],
      },
    },
    notes: { type: "string", description: "Dudas de lectura en español (texto borroso, celdas raras)" },
  },
  required: ["title", "fields", "rows"],
}

const PROMPT = `Eres un asistente que transcribe el rol de juegos de la Liga Flag Durango a partir de una imagen.

La imagen es una tabla: arriba un título con la jornada, la fecha y la sede. Hay una fila de encabezados con los campos
("Campo A", "Campo B", ...) y una columna con las horas. Cada celda tiene un partido "EQUIPO vs EQUIPO" con abreviaturas
(ej. "AZT vs ITS", "130 vs AX", "BR COPPER vs TB SILVER", "AX cA vs ITS Silver").
El COLOR DE FONDO de cada celda indica la categoría, por eso es muy importante reportarlo bien.

Reglas:
- Transcribe el texto de cada celda EXACTAMENTE como aparece (mayúsculas, números, palabras extra como COPPER, SILVER, cA).
- Usa "vs" entre los dos equipos aunque en la imagen venga "VS", "v.s." o "-".
- Omite celdas vacías. No inventes partidos.
- En "field" pon el mismo encabezado de columna que en "fields".
- En "color" elige el color de fondo más parecido de la lista. Si la celda es blanca o sin color usa "blanco".
- Si una celda tiene dos colores, usa el que ocupa más área.
- Escribe en "notes" cualquier duda breve.`

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, message: "Solo administradores." }, { status: 403 })
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Falta GEMINI_API_KEY en Vercel (Settings → Environment Variables)." },
      { status: 500 },
    )
  }
  try {
    const body = await request.json()
    const imageBase64 = String(body.image_base64 || "").replace(/^data:[^;]+;base64,/, "")
    if (!imageBase64) return NextResponse.json({ success: false, message: "Falta la imagen" }, { status: 400 })

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inline_data: { mime_type: body.mime_type || "image/jpeg", data: imageBase64 } }, { text: PROMPT }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema },
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ success: false, message: json?.error?.message || `Gemini respondió ${res.status}` }, { status: 502 })
    }
    const text: string = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || ""
    try {
      return NextResponse.json({ success: true, data: JSON.parse(text), model: GEMINI_MODEL })
    } catch {
      return NextResponse.json({ success: false, message: "No se pudo interpretar la respuesta de la IA" }, { status: 502 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Error interno" }, { status: 500 })
  }
}
