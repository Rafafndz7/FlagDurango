"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import QrScanner from "qr-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, Loader2, Users, ScanLine, AlertCircle } from "lucide-react"

export default function QRScanner({ games }: { games: any[] }) {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scanResults, setScanResults] = useState<any[]>([])
  const [lastScan, setLastScan] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const lastScannedRef = useRef("")
  const lastTimeRef = useRef(0)

  const processQRData = useCallback(async (qrData: string) => {
    if (!selectedGameId || processing) return

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
        const result = {
          player: data.data.player,
          already_registered: data.already_registered,
          message: data.message,
          timestamp: new Date(),
        }
        setLastScan(result)
        setScanResults((prev) => [result, ...prev.filter(r => r.player.id !== result.player.id)])
      } else {
        setError(data.message)
      }
    } catch (e: any) {
      setError("Error de conexión con el servidor")
    } finally {
      setProcessing(false)
    }
  }, [selectedGameId, processing])

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  const startScanning = useCallback(async () => {
    if (!selectedGameId) {
      setError("Selecciona un partido primero")
      return
    }

    setScanning(true)
    setError(null)

    // Esperar a que React renderice el elemento video
    setTimeout(async () => {
      if (!videoRef.current) return

      try {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => processQRData(result.data),
          { 
            preferredCamera: "environment", 
            highlightScanRegion: true,
            maxScansPerSecond: 5 
          }
        )
        await scannerRef.current.start()
      } catch (e) {
        setError("Cámara no disponible o permiso denegado")
        setScanning(false)
      }
    }, 150)
  }, [selectedGameId, processQRData])

  useEffect(() => {
    return () => stopScanning()
  }, [stopScanning])

  return (
    <Card className="bg-white border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" /> Escanear Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => {
            setSelectedGameId(Number(e.target.value))
            stopScanning()
          }}
          className="w-full border p-2 rounded-md bg-slate-50"
        >
          <option value="">Seleccionar partido...</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.home_team} vs {g.away_team}</option>
          ))}
        </select>

        {!scanning ? (
          <Button onClick={startScanning} className="w-full py-6 text-lg" disabled={!selectedGameId}>
            <Camera className="mr-2" /> Abrir Cámara
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border-4 border-slate-100">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {processing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <Button variant="destructive" onClick={stopScanning} className="w-full">
              <CameraOff className="mr-2" /> Apagar Cámara
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex gap-2 items-center">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {lastScan && (
          <div className={`p-4 border rounded-lg animate-in fade-in zoom-in duration-300 ${
            lastScan.already_registered ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
          }`}>
            <p className="font-bold text-lg">{lastScan.player.name}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-600">Dorsal: {lastScan.player.jersey_number || 'N/A'}</span>
              <Badge variant={lastScan.already_registered ? "outline" : "default"}>
                {lastScan.already_registered ? "Repetido" : "Registrado"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}