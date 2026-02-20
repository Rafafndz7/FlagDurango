"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, QrCode, User } from "lucide-react"

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
  profile_url?: string
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

  // Page brand colors instead of team color
  const brandBlue = "#2563eb"
  const brandPink = "#ec4899"
  const brandOrange = "#f97316"

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
          @page { margin: 12mm 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111; }
          
          .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 16px;
            margin-bottom: 20px;
            border-bottom: 3px solid ${brandBlue};
          }
          .page-header-left { display: flex; align-items: center; gap: 14px; }
          .team-logo { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${brandBlue}; }
          .team-logo-placeholder {
            width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg, ${brandBlue} 0%, ${brandPink} 100%); display: flex; align-items: center;
            justify-content: center; color: white; font-weight: bold; font-size: 18px;
          }
          .page-header h1 { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.02em; }
          .page-header h2 { font-size: 13px; color: #555; font-weight: 500; margin-top: 2px; }
          .page-header-right { text-align: right; font-size: 11px; color: #888; }
          .page-header-right strong { color: #333; font-weight: 600; }

          .player-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            page-break-inside: auto;
          }

          .player-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            page-break-inside: avoid;
            background: #fff;
          }
          .player-card-header {
            background: linear-gradient(135deg, ${brandBlue} 0%, ${brandPink} 50%, ${brandOrange} 100%);
            padding: 14px 12px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
          }
          .player-photo {
            width: 52px; height: 52px; border-radius: 50%;
            object-fit: cover; border: 2px solid #ffffff;
            position: relative; z-index: 1; background: #f1f5f9;
          }
          .player-photo-placeholder {
            width: 52px; height: 52px; border-radius: 50%;
            background: rgba(255,255,255,0.3); border: 2px solid #ffffff;
            display: flex; align-items: center; justify-content: center;
            color: rgba(255,255,255,0.7); font-size: 22px; position: relative; z-index: 1;
          }
          .player-name {
            font-size: 12px; font-weight: 700; color: #fff;
            margin-top: 8px; text-align: center; position: relative; z-index: 1;
            line-height: 1.2;
          }
          .player-meta {
            font-size: 9px; color: rgba(255,255,255,0.8);
            margin-top: 3px; position: relative; z-index: 1;
          }

          .player-card-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .player-qr { width: 110px; height: 110px; }
          .player-card-footer {
            font-size: 8px; color: #999; text-align: center;
            padding: 0 8px 8px; line-height: 1.3;
          }

          .signature-section {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 2px solid ${brandOrange};
            page-break-inside: avoid;
          }
          .signature-section h3 {
            font-size: 14px; font-weight: 700; margin-bottom: 24px; color: #333;
            text-transform: uppercase; letter-spacing: 0.05em;
          }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px 48px; }
          .signature-item {}
          .signature-line {
            border-bottom: 1.5px solid #333;
            height: 50px;
            margin-bottom: 6px;
          }
          .signature-label { font-size: 11px; color: #666; text-align: center; }

          .page-footer {
            text-align: center; margin-top: 24px; padding-top: 12px;
            border-top: 1px solid #eee; font-size: 10px; color: #aaa;
          }
          .page-footer strong { color: #666; }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .player-card-header { background: linear-gradient(135deg, ${brandBlue} 0%, ${brandPink} 50%, ${brandOrange} 100%) !important; }
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
    }, 600)
  }

  const currentDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className="bg-white border border-gray-200 overflow-hidden">
      <div className="h-1" style={{ background: `linear-gradient(135deg, ${brandBlue} 0%, ${brandPink} 50%, ${brandOrange} 100%)` }} />
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center">
          <QrCode className="w-5 h-5 mr-2 text-[#2563eb]" />
          Hoja de QR por Equipo (Imprimir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4 text-sm">
          Selecciona un equipo para generar una hoja imprimible con foto, QR y nombre de cada jugador. Incluye espacio para firmas de coaches.
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
            className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 bg-white text-sm"
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
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500 text-sm">
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
            <div className="mb-6">
              <Button
                onClick={handlePrint}
                className="w-full text-white py-3"
                style={{ background: brandBlue }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Hoja de QR ({playersWithQR.length} jugadores)
              </Button>
            </div>

            {/* Preview cards */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 mb-4">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">
                Vista previa
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {playersWithQR.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Mini gradient header */}
                    <div className="p-3 flex flex-col items-center relative" style={{ background: `linear-gradient(135deg, ${brandBlue} 0%, ${brandPink} 50%, ${brandOrange} 100%)` }}>
                      <div className="relative z-10">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center border-2 border-white"
                          >
                            <User className="w-5 h-5 text-white/70" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-white mt-1.5 truncate w-full text-center relative z-10">
                        {player.name}
                      </p>
                      <p className="text-[9px] text-white/70 relative z-10">
                        {player.jersey_number ? `#${player.jersey_number}` : ""}{" "}
                        {player.position || ""}
                      </p>
                    </div>
                    {/* QR */}
                    <div className="p-2 flex justify-center">
                      <img
                        src={player.qr_code}
                        alt={`QR ${player.name}`}
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hidden printable content */}
            <div className="hidden">
              <div ref={printRef}>
                {/* Header */}
                <div className="page-header">
                  <div className="page-header-left">
                    {teamInfo?.logo_url ? (
                      <img
                        src={teamInfo.logo_url}
                        alt={teamInfo.name}
                        className="team-logo"
                      />
                    ) : (
                      <div className="team-logo-placeholder">
                        {(teamInfo?.name || "E")[0]}
                      </div>
                    )}
                    <div>
                      <h1>{teamInfo?.name || selectedTeam?.name}</h1>
                      <h2>
                        {teamInfo?.category || selectedTeam?.category || "N/A"}{" "}
                        &mdash; Coach: {teamInfo?.coach_name || "N/A"}
                      </h2>
                    </div>
                  </div>
                  <div className="page-header-right">
                    <div><strong>Liga Flag Durango</strong></div>
                    <div>{currentDate}</div>
                    <div>{playersWithQR.length} jugadores</div>
                  </div>
                </div>

                {/* Player Grid */}
                <div className="player-grid">
                  {playersWithQR.map((player) => (
                    <div key={player.id} className="player-card">
                      <div className="player-card-header">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="player-photo"
                          />
                        ) : (
                          <div className="player-photo-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </div>
                        )}
                        <div className="player-name">{player.name}</div>
                        <div className="player-meta">
                          {player.jersey_number ? `#${player.jersey_number}` : ""}{" "}
                          {player.position ? `| ${player.position}` : ""}
                        </div>
                      </div>
                      <div className="player-card-body">
                        <img
                          src={player.qr_code}
                          alt={`QR ${player.name}`}
                          className="player-qr"
                        />
                      </div>
                      <div className="player-card-footer">
                        Escanea para ver el perfil
                      </div>
                    </div>
                  ))}
                </div>

                {/* Signature section */}
                <div className="signature-section">
                  <h3>Firmas de Enterados</h3>
                  <div className="signature-grid">
                    <div className="signature-item">
                      <div className="signature-line"></div>
                      <div className="signature-label">
                        Head Coach &mdash; {teamInfo?.coach_name || "________________"}
                      </div>
                    </div>
                    <div className="signature-item">
                      <div className="signature-line"></div>
                      <div className="signature-label">Coach Asistente</div>
                    </div>
                    <div className="signature-item">
                      <div className="signature-line"></div>
                      <div className="signature-label">Coordinador de Liga</div>
                    </div>
                    <div className="signature-item">
                      <div className="signature-line"></div>
                      <div className="signature-label">Representante del Equipo</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="page-footer">
                  <strong>Liga Flag Durango</strong> &mdash; Hoja de QR para control de asistencia &mdash; Generado el {currentDate}
                  <br />
                  Este documento es oficial. Cada codigo QR enlaza al perfil publico del jugador.
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
