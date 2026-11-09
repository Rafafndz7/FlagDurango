"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Download, Images, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLoader, PageHero } from "@/components/ui-v2/brand"

interface Photo {
  id: number
  jornada: number
  url: string
  thumb_url: string
  width: number | null
  height: number | null
  caption: string | null
}

interface JornadaInfo {
  jornada: number
  count: number
  cover: string
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = photos[index]
  const touchX = useRef<number | null>(null)
  const prev = useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex])
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, prev, next])

  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const p = photos[(i + photos.length) % photos.length]
      if (p) new Image().src = p.url
    }
  }, [index, photos])

  if (!photo) return null
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)()
        touchX.current = null
      }}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-1">
          <a href={photo.url} target="_blank" rel="noreferrer" download className="rounded-full p-2 hover:bg-white/10" aria-label="Descargar">
            <Download className="h-5 w-5" />
          </a>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4" onClick={onClose}>
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption || `Foto de la jornada ${photo.jornada}`}
          className="max-h-full max-w-full select-none object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {photo.caption && <p className="pb-4 text-center text-sm text-white/80">{photo.caption}</p>}
    </motion.div>
  )
}

function GaleriaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requested = searchParams.get("jornada")
  const [jornadas, setJornadas] = useState<JornadaInfo[]>([])
  const [jornada, setJornada] = useState<number | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/gallery${requested ? `?jornada=${requested}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success) return
        setJornadas(data.jornadas || [])
        setJornada(data.jornada)
        setPhotos(data.photos || [])
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [requested])

  const choose = (j: number) => {
    setOpen(null)
    router.push(`/galeria?jornada=${j}`, { scroll: false })
  }

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <PageHero
        eyebrow="Galería - Liga Flag Durango"
        title="Galería"
        highlight="de la jornada"
        description="Las mejores fotos de cada jornada de la temporada."
        compact
      />

      <div className="container mx-auto px-4 py-10">
        {jornadas.length > 0 && (
          <div className="-mx-4 mb-8 flex gap-3 overflow-x-auto px-4 pb-2">
            {jornadas.map((j) => (
              <button
                key={j.jornada}
                type="button"
                onClick={() => choose(j.jornada)}
                className={cn(
                  "group relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl ring-2 transition",
                  j.jornada === jornada ? "ring-brand-pink" : "ring-transparent opacity-80 hover:opacity-100",
                )}
              >
                <img src={j.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <span className="absolute bottom-1.5 left-2.5 text-left text-white">
                  <span className="block font-display text-lg font-extrabold italic leading-none">J{j.jornada}</span>
                  <span className="text-[10px] text-white/80">{j.count} fotos</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mb-3 animate-pulse break-inside-avoid rounded-2xl bg-slate-200" style={{ height: 160 + (i % 3) * 60 }} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white py-20 text-center ring-1 ring-slate-200">
            <Images className="h-12 w-12 text-slate-300" />
            <p className="font-semibold text-slate-700">Pronto subiremos las fotos de la jornada</p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-3xl font-extrabold uppercase italic text-slate-900">
              Jornada {jornada} <span className="text-base font-semibold not-italic text-slate-500">· {photos.length} fotos</span>
            </h2>
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-slate-200"
                  style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                >
                  <img
                    src={p.thumb_url}
                    alt={p.caption || `Foto ${i + 1} de la jornada ${p.jornada}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {open != null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

export default function GaleriaPage() {
  return (
    <Suspense fallback={<BrandLoader label="Cargando galería…" />}>
      <GaleriaContent />
    </Suspense>
  )
}
