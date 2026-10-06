"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell, ExternalLink, LogOut, Menu, RefreshCw, Search, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/components/ui-v2/motion"

export type AdminNavItem = {
  id: string
  label: string
  icon: LucideIcon
  description?: string
  badge?: number
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

type AdminShellProps = {
  groups: AdminNavGroup[]
  active: string
  onSelect: (id: string) => void
  user: { username: string; email?: string }
  onReload: () => Promise<unknown> | void
  onLogout: () => void
  notifications?: { count: number; target: string }
  headerActions?: ReactNode
  title?: ReactNode
  description?: ReactNode
  panelLabel?: string
  roleLabel?: string
  homeId?: string
  children: ReactNode
}

const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "AD"

function SidebarNav({
  groups,
  active,
  onSelect,
  layoutId,
}: {
  groups: AdminNavGroup[]
  active: string
  onSelect: (id: string) => void
  layoutId: string
}) {
  return (
    <nav aria-label="Secciones del panel" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.id === active
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "font-semibold text-slate-900" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={layoutId}
                        className="absolute inset-0 rounded-xl bg-slate-100"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId={`${layoutId}-bar`}
                        className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-brand-blue" : "text-slate-400 group-hover:text-slate-600",
                      )}
                    />
                    <span className="relative flex-1 truncate">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span className="relative rounded-md bg-brand-ink px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SiteCard() {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-brand-ink p-4 text-white">
      <div className="absolute inset-0 -z-10 bg-grid-white opacity-60" aria-hidden />
      <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-brand-pink/40 blur-2xl" aria-hidden />
      <div className="absolute -bottom-12 -left-8 -z-10 h-32 w-32 rounded-full bg-brand-blue/50 blur-2xl" aria-hidden />
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
        <ExternalLink className="h-4 w-4" />
      </div>
      <p className="font-display text-lg font-bold uppercase italic leading-tight">Sitio público</p>
      <p className="mt-0.5 text-xs text-white/60">Revisa cómo ven la liga los equipos</p>
      <Link
        href="/"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-2 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.02]"
      >
        Ver sitio
      </Link>
      <div className="brand-stripes absolute inset-x-0 bottom-0 h-1" aria-hidden />
    </div>
  )
}

export function AdminShell({
  groups,
  active,
  onSelect,
  user,
  onReload,
  onLogout,
  notifications,
  headerActions,
  title,
  description,
  panelLabel = "Admin",
  roleLabel = "Administrador",
  homeId = "overview",
  children,
}: AdminShellProps) {
  const reduce = useReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const allItems = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), [groups])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q),
    )
  }, [allItems, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const select = (id: string) => {
    onSelect(id)
    setMobileOpen(false)
    setSearchOpen(false)
    setQuery("")
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  }

  const handleReload = async () => {
    if (reloading) return
    setReloading(true)
    try {
      await onReload()
    } finally {
      setReloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef0f4] p-2 sm:p-3">
      <div className="flex gap-3">
        <aside className="ui-v2 sticky top-3 hidden h-[calc(100vh-1.5rem)] w-64 shrink-0 flex-col rounded-3xl bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:flex">
          <button type="button" onClick={() => select(homeId)} className="mb-6 flex items-center gap-3 px-2 text-left">
            <Image src="/images/logo-flag-durango.png" alt="Liga Flag Durango" width={120} height={48} className="h-10 w-auto" priority />
            <span className="border-l border-slate-200 pl-3 text-[10px] font-semibold uppercase leading-tight tracking-wider text-slate-400">
              Panel
              <br />
              {panelLabel}
            </span>
          </button>
          <div className="-mx-4 flex-1 overflow-y-auto px-4 [scrollbar-width:thin]">
            <SidebarNav groups={groups} active={active} onSelect={select} layoutId="admin-nav-active" />
          </div>
          <div className="pt-4">
            <SiteCard />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <header className="ui-v2 sticky top-2 z-40 flex items-center gap-2 rounded-3xl bg-white/90 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur sm:top-3 sm:gap-3 sm:px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) select(results[0].id)
                  if (e.key === "Escape") {
                    setSearchOpen(false)
                    searchRef.current?.blur()
                  }
                }}
                placeholder="Buscar sección…"
                aria-label="Buscar sección del panel"
                className="h-10 w-full rounded-full bg-slate-100 pl-10 pr-16 text-sm text-slate-900 outline-none ring-brand-blue/30 transition placeholder:text-slate-400 focus:bg-white focus:ring-2"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block">
                Ctrl K
              </kbd>
              <AnimatePresence>
                {searchOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 right-0 top-12 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                  >
                    {results.length === 0 ? (
                      <li className="px-3 py-4 text-center text-sm text-slate-500">Sin resultados</li>
                    ) : (
                      results.map((item) => {
                        const Icon = item.icon
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => select(item.id)}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <Icon className="h-4 w-4 text-slate-400" />
                              <span className="flex-1 font-medium text-slate-800">{item.label}</span>
                              <span className="text-[11px] text-slate-400">{item.group}</span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleReload}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Recargar datos"
                title="Recargar datos"
              >
                <RefreshCw className={cn("h-4 w-4", reloading && "animate-spin")} />
              </button>
              {notifications && (
                <button
                  type="button"
                  onClick={() => select(notifications.target)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label={`Solicitudes pendientes: ${notifications.count}`}
                  title="Solicitudes pendientes"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.count > 0 && (
                    <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-orange ring-2 ring-white" />
                    </span>
                  )}
                </button>
              )}
              <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-brand">
                  {initials(user.username)}
                </span>
                <div className="hidden leading-tight md:block">
                  <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.email || roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="rounded-3xl bg-[#f7f8fa] p-4 ring-1 ring-white sm:p-6">
            {(title || headerActions) && (
              <div className="ui-v2 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                >
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
                  {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </motion.div>
                {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
              </div>
            )}
            <motion.div
              key={active}
              className="admin-content"
              initial={reduce ? false : { y: 14 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="ui-v2 fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-brand-ink/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute bottom-2 left-2 top-2 flex w-[min(20rem,calc(100%-1rem))] flex-col rounded-3xl bg-white px-4 py-5 shadow-2xl"
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <Image src="/images/logo-flag-durango.png" alt="Liga Flag Durango" width={120} height={48} className="h-10 w-auto" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="-mx-4 flex-1 overflow-y-auto px-4">
                <SidebarNav groups={groups} active={active} onSelect={select} layoutId="admin-nav-active-mobile" />
              </div>
              <div className="pt-4">
                <SiteCard />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
