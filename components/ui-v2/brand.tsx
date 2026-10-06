"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "./motion"

/** Manchas de luz con los colores del logo que flotan lentamente */
export function BrandBlobs({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const reduce = useReducedMotion()
  const blobs = [
    { color: "#0857b5", size: 520, x: "-10%", y: "-20%", dx: 60, dy: 40, d: 18 },
    { color: "#e266be", size: 440, x: "45%", y: "10%", dx: -50, dy: 50, d: 22 },
    { color: "#ff6d06", size: 380, x: "75%", y: "-15%", dx: 40, dy: -30, d: 20 },
  ]
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            background: b.color,
            opacity: 0.45 * intensity,
          }}
          animate={reduce ? undefined : { x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

/** Barra de tres franjas (rosa, naranja, azul) como en el logo */
export function BrandStripes({ className }: { className?: string }) {
  return <div aria-hidden className={cn("brand-stripes h-1 w-full", className)} />
}

type PageHeroProps = {
  eyebrow?: ReactNode
  title: ReactNode
  highlight?: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
  align?: "center" | "left"
  compact?: boolean
}

/** Encabezado oscuro con luces de marca, usado en todas las páginas públicas */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
  className,
  align = "center",
  compact = false,
}: PageHeroProps) {
  const reduce = useReducedMotion()
  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  })

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-brand-ink text-white",
        compact ? "py-14 md:py-20" : "py-20 md:py-28",
        className,
      )}
    >
      <BrandBlobs />
      <div className="absolute inset-0 bg-grid-white mask-fade-b" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-ink/80 to-transparent"
      />

      <div
        className={cn(
          "container relative mx-auto px-4",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        <div className={cn("max-w-4xl", align === "center" && "mx-auto")}>
          {eyebrow && (
            <motion.div
              {...fade(0)}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-orange" />
              </span>
              {eyebrow}
            </motion.div>
          )}

          <motion.h1
            {...fade(0.08)}
            className="font-display text-5xl font-extrabold uppercase italic leading-[0.95] tracking-tight text-white md:text-7xl"
          >
            {title}
            {highlight && <span className="mt-1 block text-brand-gradient pb-1">{highlight}</span>}
          </motion.h1>

          {description && (
            <motion.p
              {...fade(0.16)}
              className={cn(
                "mt-6 text-lg leading-relaxed text-white/80 md:text-xl",
                align === "center" && "mx-auto max-w-2xl",
              )}
            >
              {description}
            </motion.p>
          )}

          {children && (
            <motion.div
              {...fade(0.24)}
              className={cn("mt-9 flex flex-col gap-3 sm:flex-row", align === "center" && "justify-center")}
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>

      <BrandStripes className="absolute bottom-0 left-0 h-1.5" />
    </section>
  )
}

/** Título de sección con línea de marca */
export function SectionHeading({
  icon,
  title,
  subtitle,
  badge,
  className,
  align = "center",
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  className?: string
  align?: "center" | "left"
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={cn("mb-10", align === "center" ? "text-center" : "text-left", className)}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <h2
        className={cn(
          "flex flex-wrap items-center gap-3 font-display text-4xl font-extrabold uppercase italic tracking-tight text-slate-900 md:text-5xl",
          align === "center" && "justify-center",
        )}
      >
        {icon && (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand not-italic">
            {icon}
          </span>
        )}
        {title}
        {badge}
      </h2>
      <div className={cn("mt-4 flex gap-1.5", align === "center" && "justify-center")} aria-hidden>
        <span className="h-1.5 w-10 rounded-full bg-brand-pink" />
        <span className="h-1.5 w-10 rounded-full bg-brand-orange" />
        <span className="h-1.5 w-10 rounded-full bg-brand-blue" />
      </div>
      {subtitle && <p className="mt-4 text-lg text-slate-600">{subtitle}</p>}
    </motion.div>
  )
}

/** Pantalla de carga con las tres franjas del logo */
export function BrandLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="ui-v2 relative flex min-h-[70vh] flex-col items-center justify-center gap-6 overflow-hidden bg-white">
      <div className="flex gap-2">
        {["bg-brand-pink", "bg-brand-orange", "bg-brand-blue"].map((c, i) => (
          <motion.span
            key={c}
            className={cn("h-3 w-14 -skew-x-12 rounded-sm", c)}
            animate={{ scaleX: [0.4, 1, 0.4], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="font-display text-xl font-bold uppercase italic tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

/** Botón principal con degradado de marca */
export const brandButtonClass =
  "relative inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-7 py-3.5 font-bold text-white shadow-brand transition-transform hover:scale-[1.03] active:scale-[0.98]"

export const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 font-semibold text-white backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
