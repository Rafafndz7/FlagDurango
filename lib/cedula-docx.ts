import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlign,
} from "docx"
import fs from "fs"
import path from "path"

export type CedulaGame = {
  id: number
  home_team: string
  away_team: string
  home_score?: number | null
  away_score?: number | null
  game_date?: string | null
  game_time?: string | null
  venue?: string | null
  field?: string | null
  category?: string | null
  jornada?: string | number | null
  referee1?: string | null
  referee2?: string | null
  status?: string | null
  mvp?: string | null
  game_type?: string | null
}

const EVIDENCE_PHONES = [
  { label: "618 261 4228", wa: "526182614228" },
  { label: "618 178 4866", wa: "526181784866" },
]

function cell(text: string, opts?: { bold?: boolean; width?: number; fill?: string }) {
  return new TableCell({
    width: { size: opts?.width || 4500, type: WidthType.DXA },
    shading: opts?.fill ? { fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  })
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: "Calibri",
        color: "1E3A8A",
      }),
    ],
  })
}

function blankLines(count: number) {
  return Array.from({ length: count }, () =>
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 },
      },
      spacing: { after: 200 },
      children: [new TextRun({ text: " ", size: 20 })],
    }),
  )
}

function formatDate(value?: string | null) {
  if (!value) return "____________________"
  const d = value.slice(0, 10)
  const [y, m, day] = d.split("-")
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}

function formatTime(value?: string | null) {
  if (!value) return "________"
  return String(value).slice(0, 5)
}

function loadLogo(): Buffer | null {
  const logoPath = path.join(process.cwd(), "public", "images", "logo-flag-durango.png")
  try {
    if (fs.existsSync(logoPath)) return fs.readFileSync(logoPath)
  } catch {
    /* ignore */
  }
  return null
}

export async function buildCedulaDocx(game: CedulaGame, categoryLabel?: string): Promise<Buffer> {
  const logo = loadLogo()
  const scoreHome = game.home_score ?? "____"
  const scoreAway = game.away_score ?? "____"
  const category = categoryLabel || game.category || "____________________"

  const headerChildren: Paragraph[] = []

  if (logo) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: logo,
            transformation: { width: 90, height: 90 },
          }),
        ],
      }),
    )
  }

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "FLAG DURANGO",
          bold: true,
          size: 36,
          font: "Calibri",
          color: "1E3A8A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "CÉDULA DE PARTIDO",
          bold: true,
          size: 28,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Documento editable — el coach acepta el resultado y puede dejar comentarios / evidencias",
          italics: true,
          size: 18,
          font: "Calibri",
          color: "555555",
        }),
      ],
    }),
  )

  const infoTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: [
      new TableRow({
        children: [
          cell("Partido #", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(String(game.id), { width: 6560 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Fecha", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(formatDate(game.game_date), { width: 6560 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Hora", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(formatTime(game.game_time), { width: 6560 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Categoría", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(category, { width: 6560 }),
        ],
      }),
      new TableRow({
        children: [
          cell("Jornada / etapa", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(
            [game.jornada != null && game.jornada !== "" ? `Jornada ${game.jornada}` : null, game.game_type]
              .filter(Boolean)
              .join(" · ") || "____________________",
            { width: 6560 },
          ),
        ],
      }),
      new TableRow({
        children: [
          cell("Sede / campo", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(
            [game.venue, game.field ? `Campo ${game.field}` : null].filter(Boolean).join(" — ") ||
              "____________________",
            { width: 6560 },
          ),
        ],
      }),
      new TableRow({
        children: [
          cell("Árbitros", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(
            [game.referee1, game.referee2].filter(Boolean).join(" / ") || "Sin asignar",
            { width: 6560 },
          ),
        ],
      }),
      new TableRow({
        children: [
          cell("Estado", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(game.status || "____________________", { width: 6560 }),
        ],
      }),
      new TableRow({
        children: [
          cell("MVP", { bold: true, width: 2800, fill: "F3F4F6" }),
          cell(game.mvp || "____________________", { width: 6560 }),
        ],
      }),
    ],
  })

  const scoreTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4000, 1360, 4000],
    rows: [
      new TableRow({
        children: [
          cell("LOCAL", { bold: true, width: 4000, fill: "DBEAFE" }),
          cell("MARCADOR", { bold: true, width: 1360, fill: "F3F4F6" }),
          cell("VISITANTE", { bold: true, width: 4000, fill: "FEE2E2" }),
        ],
      }),
      new TableRow({
        children: [
          cell(game.home_team || "Equipo local", { bold: true, width: 4000 }),
          cell(`${scoreHome}  -  ${scoreAway}`, { bold: true, width: 1360 }),
          cell(game.away_team || "Equipo visitante", { bold: true, width: 4000 }),
        ],
      }),
    ],
  })

  const doc = new Document({
    creator: "Flag Durango",
    title: `Cédula ${game.home_team} vs ${game.away_team}`,
    description: "Cédula de partido editable para aceptación y comentarios del coach",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          ...headerChildren,
          sectionTitle("1. Datos del partido"),
          infoTable,
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          sectionTitle("2. Resultado registrado"),
          scoreTable,
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: "Si el marcador está incompleto, el coach o la liga pueden completarlo al editar este Word.",
                italics: true,
                size: 18,
                color: "666666",
                font: "Calibri",
              }),
            ],
          }),

          sectionTitle("3. Aceptación del resultado (coach)"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Marca con una X la opción que corresponda. Puedes aceptar el resultado y aún así dejar comentarios abajo.",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `Coach LOCAL (${game.home_team}):   [  ] Acepto el resultado     [  ] Acepto con comentarios     [  ] No acepto / solicito revisión`,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: "Nombre y firma: _________________________________     Fecha: ______________",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 160 },
            children: [
              new TextRun({
                text: `Coach VISITANTE (${game.away_team}):   [  ] Acepto el resultado     [  ] Acepto con comentarios     [  ] No acepto / solicito revisión`,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: "Nombre y firma: _________________________________     Fecha: ______________",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),

          sectionTitle("4. Comentarios del coach (local)"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Escribe aquí observaciones, protestas o contexto del partido:",
                size: 18,
                color: "555555",
                font: "Calibri",
              }),
            ],
          }),
          ...blankLines(5),

          sectionTitle("5. Comentarios del coach (visitante)"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Escribe aquí observaciones, protestas o contexto del partido:",
                size: 18,
                color: "555555",
                font: "Calibri",
              }),
            ],
          }),
          ...blankLines(5),

          sectionTitle("6. Evidencias (fotos / videos)"),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "Puedes pegar capturas en este documento (Word permite insertar imágenes) o enviar la evidencia por WhatsApp a la liga:",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          ...EVIDENCE_PHONES.map(
            (p) =>
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `• WhatsApp: ${p.label}   →   https://wa.me/${p.wa}`,
                    size: 20,
                    font: "Calibri",
                    bold: true,
                  }),
                ],
              }),
          ),
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: "Al enviar evidencia por WhatsApp, indica: número de partido, equipos y fecha. Espacio para pegar fotos abajo:",
                size: 18,
                color: "555555",
                font: "Calibri",
              }),
            ],
          }),
          ...blankLines(6),

          sectionTitle("7. Uso interno liga / árbitros"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Notas de la liga: ________________________________________________________________",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: "________________________________________________________________________________",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Flag Durango — cédula generada desde el panel admin. Documento .docx editable.",
                size: 16,
                color: "888888",
                italics: true,
                font: "Calibri",
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

export { EVIDENCE_PHONES }
