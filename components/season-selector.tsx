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
    <label className={`flex items-center gap-2 text-sm font-semibold text-slate-600 ${className}`}>
      <span>Temporada</span>
      <select
        className="h-11 rounded-full border-0 bg-slate-100 px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0857b5]"
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

