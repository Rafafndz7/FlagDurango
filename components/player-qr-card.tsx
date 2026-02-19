"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, QrCode, User } from "lucide-react"

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

      // Card dimensions
      const cardWidth = 400
      const cardHeight = 560
      canvas.width = cardWidth
      canvas.height = cardHeight

      // Background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, cardWidth, cardHeight)

      // Header bar
      ctx.fillStyle = "#1e40af"
      ctx.fillRect(0, 0, cardWidth, 60)

      // Header text
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 18px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Liga Flag Durango", cardWidth / 2, 28)
      ctx.font = "13px Arial"
      ctx.fillText("Credencial de Jugador", cardWidth / 2, 48)

      // Player name
      ctx.fillStyle = "#111827"
      ctx.font = "bold 22px Arial"
      ctx.textAlign = "center"
      ctx.fillText(playerName, cardWidth / 2, 95)

      // Team info
      if (teamName) {
        ctx.fillStyle = "#4b5563"
        ctx.font = "16px Arial"
        ctx.fillText(teamName, cardWidth / 2, 120)
      }

      // Jersey number and position
      const infoLine = [
        jerseyNumber ? `#${jerseyNumber}` : "",
        position || "",
        teamCategory || "",
      ]
        .filter(Boolean)
        .join("  |  ")

      if (infoLine) {
        ctx.fillStyle = "#6b7280"
        ctx.font = "14px Arial"
        ctx.fillText(infoLine, cardWidth / 2, 145)
      }

      // QR Code
      const qrImage = new Image()
      qrImage.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => {
          const qrSize = 240
          const qrX = (cardWidth - qrSize) / 2
          const qrY = 165

          // QR border
          ctx.strokeStyle = "#e5e7eb"
          ctx.lineWidth = 2
          ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)

          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
          resolve()
        }
        qrImage.onerror = reject
        qrImage.src = qrCode
      })

      // Scan instruction
      ctx.fillStyle = "#9ca3af"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(
        "Escanea este QR para registrar tu asistencia",
        cardWidth / 2,
        430
      )

      // Bottom bar
      ctx.fillStyle = "#1e40af"
      ctx.fillRect(0, cardHeight - 50, cardWidth, 50)

      ctx.fillStyle = "#ffffff"
      ctx.font = "11px Arial"
      ctx.textAlign = "center"
      ctx.fillText(
        "ligaflagdurango.com.mx",
        cardWidth / 2,
        cardHeight - 30
      )
      ctx.font = "10px Arial"
      ctx.fillStyle = "#93c5fd"
      ctx.fillText(
        "20 Anos Haciendo Historia",
        cardWidth / 2,
        cardHeight - 14
      )

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
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Generando tu QR...
          </span>
        </CardContent>
      </Card>
    )
  }

  if (!qrCode) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Mi Codigo QR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Preview Card */}
        <div className="bg-gradient-to-b from-blue-700 to-blue-900 rounded-xl p-4 text-center text-white">
          <p className="text-sm font-medium opacity-80">Liga Flag Durango</p>
          <h3 className="text-lg font-bold mt-1">{playerName}</h3>
          {teamName && (
            <p className="text-sm opacity-80 mt-0.5">{teamName}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-1">
            {jerseyNumber && (
              <Badge className="bg-white/20 text-white border-0">
                #{jerseyNumber}
              </Badge>
            )}
            {position && (
              <Badge className="bg-white/20 text-white border-0">
                {position}
              </Badge>
            )}
          </div>

          {/* QR */}
          <div className="mt-4 bg-white rounded-lg p-3 inline-block mx-auto">
            <img
              src={qrCode}
              alt="Mi codigo QR"
              className="w-48 h-48"
            />
          </div>

          <p className="text-xs mt-3 opacity-60">
            Escanea este QR para registrar tu asistencia
          </p>
        </div>

        {/* Download button */}
        <Button
          onClick={downloadQR}
          disabled={downloading}
          className="w-full"
          variant="outline"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Descargar Mi QR
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Descarga tu QR personalizado para mostrarlo en los partidos y
          registrar tu asistencia de forma rapida.
        </p>

        {/* Hidden canvas for download */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
