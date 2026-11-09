"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Images } from "lucide-react"
import { SectionHeading } from "@/components/ui-v2/brand"
import { Stagger, StaggerItem } from "@/components/ui-v2/motion"

interface Photo {
  id: number
  thumb_url: string
}

export function HomeGalleryPreview() {
  const [jornada, setJornada] = useState<number | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    fetch("/api/gallery?limit=8", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return
        setJornada(data.jornada)
        setPhotos(data.photos || [])
      })
      .catch(() => {})
  }, [])

  if (photos.length === 0) return null

  return (
    <section className="mb-20">
      <SectionHeading
        icon={<Images className="h-6 w-6" />}
        title="Galería de la jornada"
        subtitle={`Las fotos de la Jornada ${jornada}`}
      />
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <StaggerItem key={p.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <Link
              href={`/galeria?jornada=${jornada}`}
              className="group block aspect-square overflow-hidden rounded-2xl bg-slate-200"
            >
              <img
                src={p.thumb_url}
                alt={`Foto de la jornada ${jornada}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-10 text-center">
        <Link
          href={`/galeria?jornada=${jornada}`}
          className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03]"
        >
          Ver toda la galería
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  )
}
