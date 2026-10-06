"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion"
import { LayoutDashboard, LogOut, Menu, Shield, UserRound, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface User {
  id: number
  username: string
  email: string
  role: string
  status: string
}

export function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [wildbrowlEnabled, setWildbrowlEnabled] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12))

  useEffect(() => {
    // Si alguna página inyectó otra nav, deja solo 1.
    const nodes = document.querySelectorAll("#main-nav")
    if (nodes.length > 1) {
      nodes.forEach((n, i) => {
        if (i > 0) n.parentElement?.removeChild(n)
      })
    }

    const syncUser = () => {
      try {
        const userData = localStorage.getItem("user")
        if (userData) setUser(JSON.parse(userData))
        else setUser(null)
      } catch {
        localStorage.removeItem("user")
        setUser(null)
      }
    }
    syncUser()
    window.addEventListener("storage", syncUser)
    return () => window.removeEventListener("storage", syncUser)
  }, [])

  useEffect(() => {
    // Mostrar "WildBrowl 1v1" si está habilitado en System Config
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/system-config", { cache: "no-store" })
        const data = await res.json()
        if (data?.success) {
          const map: Record<string, string> = {}
          for (const c of data.data as { config_key: string; config_value: string }[]) {
            map[c.config_key] = c.config_value
          }
          setWildbrowlEnabled(map["wildbrowl_enabled"] === "true")
        }
      } catch {
        // ignore
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("user")
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    setUser(null)
    router.push("/")
    router.refresh()
  }

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/partidos", label: "Partidos" },
    { href: "/equipos", label: "Equipos" },
    ...(wildbrowlEnabled ? [{ href: "/wildbrowl", label: "WildBrowl 1v1" } as const] : []),
    { href: "/estadisticas", label: "Estadísticas" },
    { href: "/reglamento", label: "Reglamento" },
  ]

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href))

  return (
    <header
      id="main-nav"
      className={cn(
        "ui-v2 sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "glass shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)]" : "bg-white",
      )}
      role="banner"
      aria-label="Navegación principal"
    >
      <div className="container mx-auto px-4">
        <div className={cn("flex items-center justify-between transition-all duration-300", scrolled ? "py-2" : "py-3.5")}>
          <Link href="/" className="group flex items-center gap-3">
            <motion.div whileHover={{ rotate: -2, scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
              <Image
                src="/images/logo-flag-durango.png"
                alt="Liga Flag Durango"
                width={200}
                height={80}
                priority
                className={cn("w-auto transition-all duration-300", scrolled ? "h-10 md:h-11" : "h-11 md:h-14")}
              />
            </motion.div>
            <span className="hidden border-l border-slate-200 pl-3 text-xs font-semibold uppercase leading-tight tracking-wider text-slate-500 lg:block">
              Torneo
              <br />
              Flag Durango
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            <div className="flex items-center gap-1 rounded-full bg-slate-100/80 p-1">
              {links.map((l) => {
                const active = isActive(l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active ? "text-white" : "text-slate-700 hover:text-slate-950",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-full bg-brand-gradient shadow-brand"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{l.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="ml-3 flex items-center gap-2">
              {user ? (
                <>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  {user.role === "coach" && (
                    <Link
                      href="/coach-dashboard"
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-100"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  )}
                  <span className="hidden text-sm text-slate-600 lg:inline">
                    Hola, <span className="font-semibold text-slate-900">{user.username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.04]"
                >
                  <UserRound className="h-4 w-4" />
                  Cuenta
                </Link>
              )}
            </div>
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 md:hidden"
            aria-label="Menú"
            aria-expanded={isMenuOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMenuOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-slate-100 bg-white md:hidden"
          >
            <motion.div
              className="container mx-auto flex flex-col gap-1.5 px-4 py-4"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
            >
              {links.map((l) => {
                const active = isActive(l.href)
                return (
                  <motion.div
                    key={l.href}
                    variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                  >
                    <Link
                      href={l.href}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition-colors",
                        active ? "bg-brand-gradient text-white shadow-brand" : "text-slate-800 hover:bg-slate-100",
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {l.label}
                      {active && <span className="h-2 w-2 rounded-full bg-white" />}
                    </Link>
                  </motion.div>
                )
              })}

              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-4"
              >
                {user ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>
                      )}
                      {user.role === "coach" && (
                        <Link
                          href="/coach-dashboard"
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-brand-blue"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      )}
                      <span className="text-sm text-slate-600">Hola, {user.username}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Salir
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-ink px-5 py-3 text-sm font-bold text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserRound className="h-4 w-4" />
                    Cuenta
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="brand-stripes h-1 w-full" />
    </header>
  )
}
