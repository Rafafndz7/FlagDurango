"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  name: string
  logoUrl?: string | null
  color1?: string | null
  color2?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
}

/** Escudo del equipo: logo si existe; si no, inicial sobre sus colores */
export function TeamAvatar({ name, logoUrl, color1, color2, size = "md", className }: Props) {
  const [broken, setBroken] = useState(false)
  const c1 = color1 || "#0857b5"
  const c2 = color2 || "#e266be"
  const showLogo = !!logoUrl && !broken

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-extrabold italic text-white ring-2 ring-white shadow-md",
        SIZES[size],
        className,
      )}
      style={{ background: showLogo ? "#ffffff" : `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      {showLogo ? (
        <img
          src={logoUrl as string}
          alt={`Logo de ${name}`}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{(name || "?").trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}
