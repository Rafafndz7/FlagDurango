"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "@/components/ui-v2/site-footer"

const PUBLIC_PREFIXES = ["/partidos", "/equipos", "/estadisticas", "/noticias", "/reglamento", "/wildbrowl", "/privacidad"]

/** Pie de página solo en las páginas públicas (no en paneles ni formularios) */
export function FooterGuard() {
  const pathname = usePathname() || "/"
  if (pathname.startsWith("/wildbrowl/admin")) return null
  const show = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  return show ? <SiteFooter /> : null
}
