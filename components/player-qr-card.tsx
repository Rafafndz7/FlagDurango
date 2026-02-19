"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Loader2, QrCode, User, ExternalLink } from "lucide-react"
import Link from "next/link"

interface PlayerQRCardProps {
  playerId: number
  playerName: string
  teamName?: string
  teamCategory?: string
  jerseyNumber?: number
  position?: string
  photoUrl?: string
}

export default function PlayerQRCard({
  playerId,
  playerName,
  teamName,
  teamCategory,
  jerseyNumber,
  position,
  photoUrl,
}: PlayerQRCardProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [profileUrl, setProfileUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const fetchQR = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/qr/generate?player_id=${playerId}`)
        const data = await res.json()
        if (data.success && data.data?.qr_code) {
          setQrCode(data.data.qr_code)
          setProfileUrl(data.data.profile_url || `/perfil/${playerId}`)
        }
      } catch (error) {
        console.error("Error fetching QR:", error)
      } finally {
        setLoading(false)
      }
    }

    if (playerId) {
      fetchQR()
    }
  }, [playerId])

  const downloadQR = async () => {
    if (!qrCode || !canvasRef.current) return

    setDownloading(true)

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const cardW = 450
      const cardH = 700
      canvas.width = cardW
      canvas.height = cardH

      // -- Background --
      ctx.fillStyle = "#0a0f1c"
      ctx.fillRect(0, 0, cardW, cardH)

      // -- Decorative top arc --
      ctx.beginPath()
      ctx.fillStyle = "#1e40af"
      ctx.ellipse(cardW / 2, 0, cardW * 0.8, 180, 0, 0, Math.PI)
      ctx.fill()

      // subtle overlay gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 200)
      grad.addColorStop(0, "rgba(10,15,28,0)")
      grad.addColorStop(1, "rgba(10,15,28,1)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 80, cardW, 120)

      // -- Liga branding --
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      ctx.font = "600 11px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("LIGA FLAG DURANGO", cardW / 2, 28)

      ctx.fillStyle = "rgba(255,255,255,0.35)"
      ctx.font = "10px Arial, sans-serif"
      ctx.fillText("20 ANOS HACIENDO HISTORIA", cardW / 2, 44)

      // -- Player photo --
      const photoY = 70
      const photoSize = 120
      const photoX = (cardW - photoSize) / 2

      // Draw circle clip for photo
      ctx.save()
      ctx.beginPath()
      ctx.arc(cardW / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2)
      ctx.clip()

      if (photoUrl) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, photoX, photoY, photoSize, photoSize)
              resolve()
            }
            img.onerror = () => {
              // fallback: draw grey circle
              ctx.fillStyle = "#1e293b"
              ctx.fillRect(photoX, photoY, photoSize, photoSize)
              resolve()
            }
            img.src = photoUrl
          })
        } catch {
          ctx.fillStyle = "#1e293b"
          ctx.fillRect(photoX, photoY, photoSize, photoSize)
        }
      } else {
        ctx.fillStyle = "#1e293b"
        ctx.fillRect(photoX, photoY, photoSize, photoSize)
      }
      ctx.restore()

      // photo border ring
      ctx.beginPath()
      ctx.arc(cardW / 2, photoY + photoSize / 2, photoSize / 2 + 3, 0, Math.PI * 2)
      ctx.strokeStyle = "#1e40af"
      ctx.lineWidth = 3
      ctx.stroke()

      // Jersey number badge
      if (jerseyNumber) {
        const badgeX = cardW / 2 + photoSize / 2 - 10
        const badgeY = photoY + photoSize - 10
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, 18, 0, Math.PI * 2)
        ctx.fillStyle = "#1e40af"
        ctx.fill()
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, 18, 0, Math.PI * 2)
        ctx.strokeStyle = "#0a0f1c"
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 14px Arial, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${jerseyNumber}`, badgeX, badgeY)
        ctx.textBaseline = "alphabetic"
      }

      // -- Player name --
      const nameY = photoY + photoSize + 40
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 24px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(playerName, cardW / 2, nameY)

      // -- Team name --
      if (teamName) {
        ctx.fillStyle = "rgba(255,255,255,0.5)"
        ctx.font = "14px Arial, sans-serif"
        ctx.fillText(teamName, cardW / 2, nameY + 24)
      }

      // -- Position / Category chips --
      const chipY = nameY + (teamName ? 50 : 30)
      const chips = [position, teamCategory].filter(Boolean) as string[]
      if (chips.length > 0) {
        const chipSpacing = 8
        const chipH = 26
        const chipPad = 16
        ctx.font = "600 11px Arial, sans-serif"
        const widths = chips.map((c) => ctx.measureText(c).width + chipPad * 2)
        const totalW = widths.reduce((a, b) => a + b, 0) + chipSpacing * (chips.length - 1)
        let chipX = (cardW - totalW) / 2

        chips.forEach((chip, i) => {
          const w = widths[i]
          // chip bg
          ctx.fillStyle = "rgba(255,255,255,0.08)"
          ctx.beginPath()
          ctx.roundRect(chipX, chipY - chipH / 2, w, chipH, chipH / 2)
          ctx.fill()
          // chip border
          ctx.strokeStyle = "rgba(255,255,255,0.1)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(chipX, chipY - chipH / 2, w, chipH, chipH / 2)
          ctx.stroke()
          // chip text
          ctx.fillStyle = "rgba(255,255,255,0.7)"
          ctx.textAlign = "center"
          ctx.fillText(chip, chipX + w / 2, chipY + 4)
          chipX += w + chipSpacing
        })
      }

      // -- Separator line --
      const sepY = chipY + 28
      ctx.strokeStyle = "rgba(255,255,255,0.06)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(60, sepY)
      ctx.lineTo(cardW - 60, sepY)
      ctx.stroke()

      // -- QR Code --
      const qrImage = new Image()
      qrImage.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => {
          const qrSize = 180
          const qrX = (cardW - qrSize) / 2
          const qrY = sepY + 20

          // white bg for qr
          const pad = 12
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 12)
          ctx.fill()

          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
          resolve()
        }
        qrImage.onerror = reject
        qrImage.src = qrCode
      })

      // -- Scan text --
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.font = "10px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Escanea para ver mi perfil", cardW / 2, cardH - 40)

      // -- Bottom bar --
      ctx.fillStyle = "#1e40af"
      ctx.fillRect(0, cardH - 24, cardW, 24)
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      ctx.font = "9px Arial, sans-serif"
      ctx.fillText("ligaflagdurango.com.mx", cardW / 2, cardH - 9)

      // Download
      const link = document.createElement("a")
      link.download = `QR_${playerName.replace(/\s+/g, "_")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (error) {
      console.error("Error downloading QR:", error)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500 text-sm">Generando tu QR...</span>
        </CardContent>
      </Card>
    )
  }

  if (!qrCode) {
    return null
  }

  return (
    <Card className="bg-white border border-gray-200 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
          <QrCode className="h-4 w-4" />
          Mi Codigo QR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Premium QR Preview */}
        <div className="relative bg-[#0a0f1c] rounded-2xl overflow-hidden">
          {/* Decorative gradient top */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-800/40 to-transparent" />
          <div
            className="absolute top-0 left-0 right-0 h-24 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative px-5 pt-5 pb-6 flex flex-col items-center">
            {/* Liga branding */}
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-4 font-semibold">
              Liga Flag Durango
            </p>

            {/* Player photo */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-blue-700 shadow-lg shadow-blue-900/30">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={playerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <User className="w-10 h-10 text-slate-600" />
                  </div>
                )}
              </div>
              {jerseyNumber && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-700 border-2 border-[#0a0f1c] flex items-center justify-center text-white text-xs font-bold shadow">
                  {jerseyNumber}
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="text-lg font-bold text-white text-center leading-tight">
              {playerName}
            </h3>
            {teamName && (
              <p className="text-xs text-white/40 mt-1">{teamName}</p>
            )}

            {/* Chips */}
            <div className="flex items-center gap-2 mt-2">
              {position && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white/60 bg-white/[0.06] border border-white/[0.08]">
                  {position}
                </span>
              )}
              {teamCategory && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white/60 bg-white/[0.06] border border-white/[0.08]">
                  {teamCategory}
                </span>
              )}
            </div>

            {/* Separator */}
            <div className="w-2/3 h-px bg-white/[0.06] my-4" />

            {/* QR */}
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <img
                src={qrCode}
                alt="Mi codigo QR"
                className="w-40 h-40"
              />
            </div>

            <p className="text-[10px] text-white/25 mt-3">
              Escanea para ver mi perfil
            </p>
          </div>

          {/* Bottom brand bar */}
          <div className="bg-blue-800 py-1.5 text-center">
            <span className="text-[9px] text-white/50">ligaflagdurango.com.mx</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={downloadQR}
            disabled={downloading}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar QR
          </Button>
          <Link href={`/perfil/${playerId}`} target="_blank" className="flex-shrink-0">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 h-full">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          Descarga tu credencial QR para mostrarlo en los partidos.
          Al escanearlo, se abre tu perfil publico de jugador.
        </p>

        {/* Hidden canvas for download */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
