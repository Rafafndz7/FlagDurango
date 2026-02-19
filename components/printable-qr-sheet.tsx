"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Loader2, Users, QrCode, Download } from "lucide-react"

interface Team {
  id: number
  name: string
  category?: string
  coach_name?: string
  color1?: string
  color2?: string
  logo_url?: string
}

interface PlayerWithQR {
  id: number
  name: string
  jersey_number?: number
  position?: string
  photo_url?: string
  team_id: number
  qr_code: string
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
    coach_name?: string
    color1?: string
    color2?: string
  }
}

interface PrintableQRSheetProps {
  teams: Team[]
}

export default function PrintableQRSheet({ teams }: PrintableQRSheetProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [playersWithQR, setPlayersWithQR] = useState<PlayerWithQR[]>([])
  const [loading, setLoading] = useState(false)
  const [teamInfo, setTeamInfo] = useState<Team | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  const fetchTeamQRs = async (teamId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/qr/generate?team_id=${teamId}`)
      const data = await res.json()

      if (data.success) {
        setPlayersWithQR(data.data)
        if (data.data.length > 0 && data.data[0].teams) {
          setTeamInfo({
            id: teamId,
            name: data.data[0].teams.name,
            category: data.data[0].teams.category,
            coach_name: data.data[0].teams.coach_name,
            color1: data.data[0].teams.color1,
            color2: data.data[0].teams.color2,
            logo_url: data.data[0].teams.logo_url,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching QRs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = (teamId: number) => {
    setSelectedTeamId(teamId)
    fetchTeamQRs(teamId)
  }

  const handlePrint = () => {
    if (!printRef.current) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const printContent = printRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${teamInfo?.name || "Equipo"}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
          
          .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1e40af; }
          .header h1 { font-size: 24px; font-weight: bold; color: #1e40af; }
          .header h2 { font-size: 18px; color: #333; margin-top: 4px; }
          .header p { font-size: 14px; color: #666; margin-top: 4px; }
          
          .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; page-break-inside: auto; }
          
          .player-card { 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            padding: 12px; 
            text-align: center; 
            page-break-inside: avoid; 
          }
          .player-card img { width: 140px; height: 140px; margin: 0 auto 8px; display: block; }
          .player-name { font-size: 14px; font-weight: bold; color: #111; }
          .player-info { font-size: 11px; color: #666; margin-top: 2px; }
          
          .signature-section { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #1e40af; 
            page-break-inside: avoid; 
          }
          .signature-section h3 { font-size: 16px; font-weight: bold; margin-bottom: 24px; color: #333; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature-line { border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 4px; height: 60px; }
          .signature-label { font-size: 12px; color: #666; text-align: center; }
          
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #999; }

          @media print { 
            body { padding: 10px; }
            .qr-grid { gap: 12px; }
            .player-card img { width: 120px; height: 120px; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `)

    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const currentDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center">
          <QrCode className="w-5 h-5 mr-2" />
          Hoja de QR por Equipo (Imprimir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Selecciona un equipo para generar una hoja imprimible con los QR de todos sus jugadores, nombre del equipo y espacio para firma de coaches.
        </p>

        {/* Team selector */}
        <div className="mb-6">
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) =>
              e.target.value
                ? handleTeamSelect(Number(e.target.value))
                : setSelectedTeamId(null)
            }
            className="w-full border border-gray-300 rounded-md p-2 text-gray-900 bg-white"
          >
            <option value="">-- Seleccionar Equipo --</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.category || "Sin categoria"})
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">
              Generando codigos QR...
            </span>
          </div>
        )}

        {!loading && selectedTeamId && playersWithQR.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron jugadores para este equipo.
          </div>
        )}

        {!loading && playersWithQR.length > 0 && (
          <>
            {/* Print button */}
            <div className="flex gap-3 mb-6">
              <Button
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                <Printer className="w-5 h-5 mr-2" />
                Imprimir Hoja de QR
              </Button>
            </div>

            {/* Preview */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
              <p className="text-sm text-gray-600 mb-2 font-medium">
                Vista previa ({playersWithQR.length} jugadores):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {playersWithQR.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <img
                      src={player.qr_code}
                      alt={`QR ${player.name}`}
                      className="w-24 h-24 mx-auto mb-2"
                    />
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {player.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {player.jersey_number
                        ? `#${player.jersey_number}`
                        : ""}{" "}
                      {player.position || ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hidden printable content */}
            <div className="hidden">
              <div ref={printRef}>
                {/* Header */}
                <div className="header">
                  <h1>Liga Flag Durango</h1>
                  <h2>{teamInfo?.name || selectedTeam?.name}</h2>
                  <p>
                    Categoria: {teamInfo?.category || selectedTeam?.category || "N/A"} |
                    Coach: {teamInfo?.coach_name || "N/A"} | Fecha:{" "}
                    {currentDate}
                  </p>
                  <p style={{ marginTop: "8px", fontSize: "12px" }}>
                    Total de jugadores: {playersWithQR.length}
                  </p>
                </div>

                {/* QR Grid */}
                <div className="qr-grid">
                  {playersWithQR.map((player) => (
                    <div key={player.id} className="player-card">
                      <img
                        src={player.qr_code}
                        alt={`QR ${player.name}`}
                      />
                      <div className="player-name">{player.name}</div>
                      <div className="player-info">
                        {player.jersey_number
                          ? `#${player.jersey_number}`
                          : ""}{" "}
                        {player.position ? `| ${player.position}` : ""}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Signature section */}
                <div className="signature-section">
                  <h3>Firmas de Enterados</h3>
                  <div className="signature-grid">
                    <div>
                      <div className="signature-line"></div>
                      <div className="signature-label">
                        Head Coach - {teamInfo?.coach_name || "________________"}
                      </div>
                    </div>
                    <div>
                      <div className="signature-line"></div>
                      <div className="signature-label">
                        Coach Asistente
                      </div>
                    </div>
                    <div>
                      <div className="signature-line"></div>
                      <div className="signature-label">
                        Coordinador de Liga
                      </div>
                    </div>
                    <div>
                      <div className="signature-line"></div>
                      <div className="signature-label">
                        Representante del Equipo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer">
                  <p>
                    Liga Flag Durango - Hoja de QR para control de asistencia
                    - Generado el {currentDate}
                  </p>
                  <p>
                    Este documento es oficial. Los codigos QR son unicos por
                    jugador.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
