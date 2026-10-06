"use client"

import { useEffect, useState } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

type Item = { id: string; text: string }

/** Índice lateral y barra de progreso; toma los títulos de las secciones del contenedor [data-reglamento] */
export function ReglamentoToc() {
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState<string | null>(null)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("[data-reglamento] section > h2"))
    const list = headings.map((h, i) => {
      if (!h.id) h.id = `seccion-${i + 1}`
      return { id: h.id, text: (h.textContent || "").trim() }
    })
    setItems(list)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -70% 0px" },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-brand-gradient"
        style={{ scaleX: progress }}
      />
      <aside className="hidden lg:block">
        <nav className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl bg-white p-4 ring-1 ring-slate-200">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Contenido</p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = active === item.id
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={cn(
                      "relative block rounded-xl px-3 py-2 text-[13px] leading-snug transition-colors",
                      isActive ? "font-semibold text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="reglamento-toc-active"
                        className="absolute inset-0 rounded-xl bg-brand-gradient"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{item.text}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
