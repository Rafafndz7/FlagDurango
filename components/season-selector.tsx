"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Season } from "@/lib/seasons"

export function SeasonSelector({ className = "" }: { className?: string }) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch("/api/seasons").then((r) => r.json()).then((r) => r.success && setSeasons(r.data || []))
  }, [])

  const selected = params.get("season") || seasons.find((season) => season.is_active)?.id || ""
  if (!seasons.length) return null

  return (
    <label className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      <span>Temporada</span>
      <select
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
        value={selected}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString())
          next.set("season", event.target.value)
          router.push(`${pathname}?${next.toString()}`)
        }}
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}{season.is_active ? " (activa)" : ""}
          </option>
        ))}
      </select>
    </label>
  )
}

