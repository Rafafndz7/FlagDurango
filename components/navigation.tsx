"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X } from "lucide-react"
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
  const router = useRouter()
  const pathname = usePathname()

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
  ]

  return (
    <header
      id="main-nav"
      className="w-full border-b bg-white sticky top-0 z-50"
      role="banner"
      aria-label="Navegación principal"
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-center">
            <div className="flex flex-col items-center">
              <Image
                src="/images/logo-flag-durango.png"
                alt="Liga Flag Durango"
                width={200}
                height={80}
                className="h-12 md:h-16 w-auto"
              />
              <p className="text-neutral-500 text-sm mt-1">Torneo FlagDUrago - Primavera 2026</p>
            </div>
          </Link>

          <nav aria-label="Principal" className="hidden md:flex items-center gap-6">
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn("text-sm font-medium text-neutral-900 hover:underline", active && "text-yellow-500")}
                >
                  {l.label}
                </Link>
              )
            })}

            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === "admin" && (
                  <Link href="/admin" className="text-yellow-500 hover:text-yellow-600 font-medium">
                    Admin
                  </Link>
                )}
                {user.role === "coach" && (
                  <Link href="/coach-dashboard" className="text-blue-500 hover:text-blue-600 font-medium">
                    Dashboard
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-neutral-800 text-sm">Hola, {user.username}</span>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-neutral-900 hover:text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-neutral-900 hover:underline">
                Cuenta
              </Link>
            )}
          </nav>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-neutral-900" aria-label="Menú">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100">
            <div className="flex flex-col space-y-4">
              {links.map((l) => {
                const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                      active && "bg-neutral-900 text-white hover:bg-neutral-900",
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                )
              })}

              {user ? (
                <div className="flex items-center justify-between border-top pt-3">
                  {user.role === "admin" && (
                    <Link href="/admin" className="text-yellow-600 font-medium" onClick={() => setIsMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  {user.role === "coach" && (
                    <Link
                      href="/coach-dashboard"
                      className="text-blue-600 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  <Button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-neutral-900 hover:text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="sr-only">Cerrar sesión</span>
                  </Button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-semibold text-neutral-900 hover:underline"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cuenta
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600" />
    </header>
  )
}
