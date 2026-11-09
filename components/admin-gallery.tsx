"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, ExternalLink, Images, Loader2, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { compressPhoto, formatBytes } from "@/lib/image-compress"

interface Photo {
  id: number
  jornada: number
  url: string
  thumb_url: string
  width: number | null
  height: number | null
}

interface JornadaInfo {
  jornada: number
  count: number
}

type QueueStatus = "waiting" | "compressing" | "uploading" | "done" | "error"

interface QueueItem {
  key: string
  file: File
  jornada: number
  status: QueueStatus
  compressed?: number
  error?: string
}

const CONCURRENCY = 3

export default function AdminGallery() {
  const [jornada, setJornada] = useState<number | null>(null)
  const [gameJornadas, setGameJornadas] = useState<number[]>([])
  const [jornadas, setJornadas] = useState<JornadaInfo[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const jornadaRef = useRef<number | null>(null)
  jornadaRef.current = jornada

  const load = useCallback(async (j?: number | null) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/gallery${j != null ? `?jornada=${j}` : ""}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Error cargando la galería")
      setGameJornadas(data.game_jornadas || [])
      setJornadas(data.jornadas || [])
      setPhotos(data.photos || [])
      setJornada(data.jornada ?? data.current_jornada)
      setSelected(new Set())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const uploading = queue.some((q) => q.status === "waiting" || q.status === "compressing" || q.status === "uploading")

  useEffect(() => {
    if (!uploading) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [uploading])

  const jornadaOptions = useMemo(() => {
    const all = new Set([...gameJornadas, ...jornadas.map((j) => j.jornada)])
    const max = Math.max(0, ...Array.from(all))
    for (let j = 1; j <= max + 1; j++) all.add(j)
    return Array.from(all).sort((a, b) => b - a)
  }, [gameJornadas, jornadas])

  const countFor = (j: number) => jornadas.find((x) => x.jornada === j)?.count || 0

  const patch = (key: string, values: Partial<QueueItem>) =>
    setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...values } : item)))

  const uploadOne = async (item: QueueItem) => {
    try {
      patch(item.key, { status: "compressing" })
      const { full, thumb } = await compressPhoto(item.file)
      patch(item.key, { status: "uploading", compressed: full.blob.size + thumb.blob.size })
      const ext = (b: Blob) => (b.type === "image/webp" ? "webp" : "jpg")
      const form = new FormData()
      form.append("file", full.blob, `foto.${ext(full.blob)}`)
      form.append("thumb", thumb.blob, `thumb.${ext(thumb.blob)}`)
      form.append("jornada", String(item.jornada))
      form.append("width", String(full.width))
      form.append("height", String(full.height))
      const res = await fetch("/api/admin/gallery", { method: "POST", body: form })
      const data = await res.json().catch(() => ({ success: false, message: `Error ${res.status}` }))
      if (!data.success) throw new Error(data.message || "No se pudo subir")
      patch(item.key, { status: "done" })
      if (jornadaRef.current === item.jornada) setPhotos((p) => [...p, data.photo])
      setJornadas((list) => {
        const found = list.find((j) => j.jornada === item.jornada)
        return found
          ? list.map((j) => (j.jornada === item.jornada ? { ...j, count: j.count + 1 } : j))
          : [...list, { jornada: item.jornada, count: 1 }]
      })
    } catch (e: any) {
      patch(item.key, { status: "error", error: e.message || "Error" })
    }
  }

  const runPool = async (items: QueueItem[]) => {
    let next = 0
    const worker = async () => {
      while (next < items.length) {
        const item = items[next++]
        await uploadOne(item)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  }

  const addFiles = (files: FileList | File[]) => {
    if (jornada == null) return
    const images = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name))
    if (images.length === 0) return
    const items: QueueItem[] = images.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      jornada,
      status: "waiting",
    }))
    setQueue((q) => [...q.filter((x) => x.status !== "done"), ...items])
    runPool(items)
  }

  const retryFailed = () => {
    const failed = queue.filter((q) => q.status === "error").map((q) => ({ ...q, status: "waiting" as const, error: undefined }))
    if (failed.length === 0) return
    setQueue((q) => q.map((x) => (x.status === "error" ? { ...x, status: "waiting", error: undefined } : x)))
    runPool(failed)
  }

  const removePhotos = async (ids: number[]) => {
    if (ids.length === 0 || !confirm(ids.length === 1 ? "¿Borrar esta foto?" : `¿Borrar ${ids.length} fotos?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/gallery?ids=${ids.join(",")}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "No se pudieron borrar")
      setPhotos((p) => p.filter((x) => !ids.includes(x.id)))
      setJornadas((list) => list.map((j) => (j.jornada === jornada ? { ...j, count: Math.max(0, j.count - ids.length) } : j)))
      setSelected(new Set())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const totals = queue.reduce(
    (acc, q) => {
      acc[q.status] += 1
      if (q.status === "done" || q.status === "uploading") {
        acc.original += q.file.size
        acc.compressed += q.compressed || 0
      }
      return acc
    },
    { waiting: 0, compressing: 0, uploading: 0, done: 0, error: 0, original: 0, compressed: 0 },
  )
  const finished = totals.done + totals.error

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 bg-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Images className="h-5 w-5 text-pink-500" />
              Galería de la jornada
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Las fotos se comprimen en tu navegador antes de subir (máx. 1920 px, WebP) y salen en la página pública /galeria.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded border px-2 text-sm"
              value={jornada ?? ""}
              onChange={(e) => load(Number(e.target.value))}
              disabled={loading}
            >
              {jornadaOptions.map((j) => (
                <option key={j} value={j}>
                  Jornada {j}
                  {countFor(j) ? ` (${countFor(j)} fotos)` : ""}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => load(jornada)} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/galeria${jornada ? `?jornada=${jornada}` : ""}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                Ver pública
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-100 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragging ? "border-pink-500 bg-pink-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="font-semibold text-gray-900">Arrastra aquí todas las fotos de la Jornada {jornada ?? "…"}</p>
            <p className="text-xs text-gray-500">o pica para elegirlas (puedes seleccionar muchas a la vez)</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </div>

          {queue.length > 0 && (
            <div className="space-y-2 rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <span className="font-semibold text-gray-900">
                  {finished} de {queue.length} listas
                </span>
                {totals.original > 0 && (
                  <span className="text-xs text-gray-500">
                    {formatBytes(totals.original)} → {formatBytes(totals.compressed)}
                  </span>
                )}
                {totals.error > 0 && (
                  <Button size="sm" variant="outline" onClick={retryFailed} disabled={uploading} className="ml-auto">
                    Reintentar {totals.error} con error
                  </Button>
                )}
                {!uploading && (
                  <Button size="sm" variant="ghost" onClick={() => setQueue([])} className={totals.error ? "" : "ml-auto"}>
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-pink-500 transition-all" style={{ width: `${(finished / queue.length) * 100}%` }} />
              </div>
              {queue.some((q) => q.status === "error") && (
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-red-700">
                  {queue
                    .filter((q) => q.status === "error")
                    .map((q) => (
                      <li key={q.key}>
                        {q.file.name}: {q.error}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {photos.length} fotos en la Jornada {jornada}
            </p>
            {photos.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
                >
                  {selected.size === photos.length ? "Quitar selección" : "Seleccionar todas"}
                </Button>
                {selected.size > 0 && (
                  <Button size="sm" variant="outline" className="text-red-600" disabled={deleting} onClick={() => removePhotos(Array.from(selected))}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Borrar {selected.size}
                  </Button>
                )}
              </>
            )}
          </div>

          {loading && photos.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando fotos…
            </div>
          ) : photos.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Todavía no hay fotos en esta jornada.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {photos.map((p) => {
                const isSelected = selected.has(p.id)
                return (
                  <div
                    key={p.id}
                    className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${isSelected ? "ring-4 ring-pink-500" : ""}`}
                  >
                    <button type="button" onClick={() => toggle(p.id)} className="block h-full w-full" aria-label="Seleccionar foto">
                      <img src={p.thumb_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                    <span
                      className={`pointer-events-none absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${
                        isSelected ? "bg-pink-500 text-white" : "bg-black/30"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhotos([p.id])}
                      disabled={deleting}
                      className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                      aria-label="Borrar foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
