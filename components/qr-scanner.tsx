"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import QrScanner from "qr-scanner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  CameraOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  ScanLine,
} from "lucide-react"

/* ================= TYPES ================= */

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string
  game_time: string
  venue: string
  field: string
  category: string
  status: string
}

interface ScannedPlayer {
  id: number
  name: string
  jersey_number?: number
  photo_url?: string
  teams?: { name: string }
}

interface ScanResult {
  player: ScannedPlayer
  already_registered: boolean
  message: string
  timestamp: Date
}

interface QRScannerProps {
  games: Game[]
}

/* ================= COMPONENT ================= */

export default function QRScanner({ games }: QRScannerProps) {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  const lastScannedRef = useRef("")
  const lastTimeRef = useRef(0)

  /* ================= PROCESS QR ================= */

  const processQRData = useCallback(
    async (qrData: string) => {
      if (!selectedGameId) return

      const now = Date.now()
      if (qrData === lastScannedRef.current && now - lastTimeRef.current < 3000) return

      lastScannedRef.current = qrData
      lastTimeRef.current = now

      setProcessing(true)
      setError(null)

      try {
        const res = await fetch("/api/qr/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_data: qrData, game_id: selectedGameId }),
        })

        const data = await res.json()

        if (data.success) {
          const result: ScanResult = {
            player: data.data.player,
            already_registered: data.already_registered,
            message: data.message,
            timestamp: new Date(),
          }

          setLastScan(result)

          setScanResults((prev) => {
            const filtered = prev.filter((r) => r.player.id !== result.player.id)
            return [result, ...filtered]
          })
        } else {
          setError(data.message)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setProcessing(false)
      }
    },
    [selectedGameId]
  )

  /* ================= START ================= */

 const startScanning = useCallback(async () => {
    if (!selectedGameId) {
      setError("Selecciona un partido")
      return
    }

    const video = videoRef.current
    if (!video) return

    try {
      // Let QrScanner handle the camera stream — do NOT call getUserMedia manually.
      // Setting playsInline/muted on the element is done in JSX for iOS Safari.
      scannerRef.current = new QrScanner(
        video,
        (result) => {
          if (result?.data) processQRData(result.data)
        },
        { preferredCamera: "environment", highlightScanRegion: true }
      )

      await scannerRef.current.start()
      setScanning(true)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Permiso de camara bloqueado o no disponible")
    }
  }, [selectedGameId, processQRData])

  /* ================= STOP ================= */

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }
    setScanning(false)
  }, [])
  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop()
        scannerRef.current.destroy()
        scannerRef.current = null
      }
    }
  }, [])

  /* ================= UI ================= */

  const selectedGame = games.find((g) => g.id === selectedGameId)

  return (
    <Card className="bg-white border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ScanLine className="w-5 h-5 mr-2" />
          Escanear QR
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => setSelectedGameId(Number(e.target.value))}
          className="w-full border p-2 rounded"
        >
          <option value="">Seleccionar partido</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.home_team} vs {g.away_team}
            </option>
          ))}
        </select>

        {!scanning ? (
          <Button onClick={startScanning} className="w-full">
            <Camera className="mr-2" /> Iniciar escaneo
          </Button>
        ) : (
          <>
            <div className="relative bg-black rounded overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {processing && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando
                </div>
              )}
            </div>

            <Button variant="outline" onClick={stopScanning} className="w-full">
              <CameraOff className="mr-2" /> Detener
            </Button>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border rounded flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {error}
          </div>
        )}

        {lastScan && (
          <div
            className={`p-4 border rounded ${
              lastScan.already_registered ? "bg-amber-50" : "bg-green-50"
            }`}
          >
            <p className="font-semibold">{lastScan.player.name}</p>
            <Badge>
              {lastScan.already_registered ? "Ya registrado" : "Asistencia OK"}
            </Badge>
          </div>
        )}

        {scanResults.length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Escaneados ({scanResults.length})
            </h4>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
