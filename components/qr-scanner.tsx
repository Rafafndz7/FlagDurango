"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  ScanLine,
} from "lucide-react"

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
  position?: string
  photo_url?: string
  teams?: {
    id: number
    name: string
    category: string
  }
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

export default function QRScanner({ games }: QRScannerProps) {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScannedRef = useRef<string>("")
  const lastScannedTimeRef = useRef<number>(0)

  const categories = Array.from(new Set(games.map((g) => g.category))).sort()
  const filteredGames = games.filter(
    (g) => categoryFilter === "all" || g.category === categoryFilter
  )
  const selectedGame = games.find((g) => g.id === selectedGameId)

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  const processQRData = useCallback(
    async (qrData: string) => {
      if (!selectedGameId) return

      // Debounce: avoid scanning the same QR within 3 seconds
      const now = Date.now()
      if (qrData === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) {
        return
      }
      lastScannedRef.current = qrData
      lastScannedTimeRef.current = now

      setProcessing(true)
      setError(null)

      try {
        const res = await fetch("/api/qr/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_data: qrData,
            game_id: selectedGameId,
          }),
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
            // Remove duplicate if exists
            const filtered = prev.filter(
              (r) => r.player.id !== result.player.id
            )
            return [result, ...filtered]
          })
        } else {
          setError(data.message)
        }
      } catch (err: any) {
        setError(err.message || "Error al procesar el QR")
      } finally {
        setProcessing(false)
      }
    },
    [selectedGameId]
  )

  const startScanning = useCallback(async () => {
    if (!selectedGameId) {
      setError("Primero selecciona un partido")
      return
    }

    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setScanning(true)

      // Start scanning frames using BarcodeDetector API if available, 
      // otherwise fall back to manual input
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        })

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return

          const canvas = canvasRef.current
          const ctx = canvas.getContext("2d")
          if (!ctx) return

          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

          try {
            const barcodes = await detector.detect(canvas)
            if (barcodes.length > 0) {
              const qrData = barcodes[0].rawValue
              if (qrData) {
                processQRData(qrData)
              }
            }
          } catch {
            // Barcode detection failed - silently continue
          }
        }, 500)
      } else {
        // BarcodeDetector not available - show manual input fallback
        setError(
          "Tu navegador no soporta escaneo de QR. Usa la entrada manual o Chrome en Android."
        )
      }
    } catch (err: any) {
      setError("No se pudo acceder a la camara. Verifica los permisos.")
      console.error("Camera error:", err)
    }
  }, [selectedGameId, processQRData])

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  const [manualInput, setManualInput] = useState("")

  const handleManualScan = () => {
    if (manualInput.trim()) {
      processQRData(manualInput.trim())
      setManualInput("")
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    } catch {
      return dateStr
    }
  }

  const attendedCount = scanResults.filter((r) => !r.already_registered).length
  const totalScanned = scanResults.length

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center">
          <ScanLine className="w-5 h-5 mr-2" />
          Escanear QR - Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Escanea el QR de cada jugador para registrar su asistencia al partido.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => {
              setCategoryFilter("all")
              setSelectedGameId(null)
              stopScanning()
            }}
            className={
              categoryFilter === "all"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }
          >
            Todas
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? "default" : "outline"}
              onClick={() => {
                setCategoryFilter(cat)
                setSelectedGameId(null)
                stopScanning()
              }}
              className={
                categoryFilter === cat
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Game selector */}
        <div className="mb-6">
          <select
            value={selectedGameId ?? ""}
            onChange={(e) => {
              setSelectedGameId(e.target.value ? Number(e.target.value) : null)
              stopScanning()
              setScanResults([])
              setLastScan(null)
            }}
            className="w-full border border-gray-300 rounded-md p-2 text-gray-900 bg-white"
          >
            <option value="">-- Seleccionar Partido --</option>
            {filteredGames.map((game) => (
              <option key={game.id} value={game.id}>
                {formatDate(game.game_date)} | {game.home_team} vs{" "}
                {game.away_team} ({game.status})
              </option>
            ))}
          </select>
        </div>

        {selectedGame && (
          <>
            {/* Game info */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4 border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {selectedGame.home_team} vs {selectedGame.away_team}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedGame.game_date)} -{" "}
                    {selectedGame.game_time} | {selectedGame.venue},{" "}
                    {selectedGame.field}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    {attendedCount} nuevos / {totalScanned} escaneados
                  </div>
                </div>
              </div>
            </div>

            {/* Camera / Scanner */}
            <div className="mb-4">
              {!scanning ? (
                <Button
                  onClick={startScanning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  Iniciar Escaneo con Camara
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-blue-400 rounded-lg opacity-70">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                      </div>
                    </div>
                    {processing && (
                      <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <Button
                    onClick={stopScanning}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <CameraOff className="w-4 h-4 mr-2" />
                    Detener Escaneo
                  </Button>
                </div>
              )}
            </div>

            {/* Manual input fallback */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">
                Entrada manual (pega el contenido del QR):
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                  placeholder="URL del perfil o ID del jugador"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
                />
                <Button
                  onClick={handleManualScan}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!manualInput.trim() || processing}
                >
                  Registrar
                </Button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Last scan result */}
            {lastScan && (
              <div
                className={`mb-4 p-4 rounded-lg border-2 ${
                  lastScan.already_registered
                    ? "bg-amber-50 border-amber-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {lastScan.already_registered ? (
                    <AlertCircle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {lastScan.player.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {lastScan.player.jersey_number
                        ? `#${lastScan.player.jersey_number}`
                        : ""}{" "}
                      {lastScan.player.teams?.name || ""}
                    </p>
                  </div>
                  <Badge
                    className={
                      lastScan.already_registered
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }
                  >
                    {lastScan.already_registered
                      ? "Ya registrado"
                      : "Asistencia OK"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Scan history */}
            {scanResults.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Jugadores escaneados ({scanResults.length})
                </h4>
                <div className="grid gap-1 max-h-64 overflow-y-auto">
                  {scanResults.map((result, index) => (
                    <div
                      key={`${result.player.id}-${index}`}
                      className={`flex items-center gap-3 p-2 rounded-lg border ${
                        result.already_registered
                          ? "bg-amber-50 border-amber-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      {result.already_registered ? (
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {result.player.photo_url ? (
                          <img
                            src={result.player.photo_url}
                            alt={result.player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            {result.player.jersey_number || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {result.player.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.player.teams?.name} - #
                          {result.player.jersey_number}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {result.timestamp.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
