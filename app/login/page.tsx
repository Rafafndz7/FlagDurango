"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react"
import { BrandBlobs, brandButtonClass } from "@/components/ui-v2/brand"
import { EASE_OUT } from "@/components/ui-v2/motion"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si ya está logueado
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role === "admin") {
          router.push("/admin")
        } else if (user.role === "referee_coordinator") {
          router.push("/arbitros")
        } else if (user.role === "player") {
          router.push("/player")
        } else if (user.role === "coach") {
          router.push("/coach-dashboard")
        } else {
          router.push("/coach-dashboard")
        }
      }
    } catch (e) {
      // Ignorar errores de parsing
    }
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("Enviando login para:", email)

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      console.log("Respuesta del login:", data)

      if (!data?.success || !data?.user) {
        setError(data?.message || "Credenciales inválidas")
        return
      }

      const user = data.user
      console.log("Usuario logueado:", user)

      // Guardar en localStorage
      try {
        localStorage.setItem("user", JSON.stringify(user))
        console.log("Usuario guardado en localStorage")
      } catch (storageError) {
        console.error("Error guardando en localStorage:", storageError)
      }

      // Crear cookie para el middleware
      document.cookie = `user=${JSON.stringify(user)}; path=/; max-age=${60 * 60 * 24 * 7}` // 7 días

      console.log("Cookie creada, redirigiendo...")

      // Redireccionar según el rol
      if (user.role === "admin" || user.role === "staff") {
        console.log("Redirigiendo a admin")
        router.push("/admin")
      } else if (user.role === "referee_coordinator") {
        console.log("Redirigiendo a portal de árbitros")
        router.push("/arbitros")
      } else if (user.role === "player") {
        console.log("Redirigiendo a player portal")
        router.push("/player")
      } else if (user.role === "coach") {
        console.log("Redirigiendo a coach dashboard")
        router.push("/coach-dashboard")
      } else {
        console.log("Redirigiendo a coach-dashboard")
        router.push("/coach-dashboard")
      }
    } catch (error) {
      console.error("Error en login:", error)
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "h-12 w-full rounded-2xl border-0 bg-slate-100 pl-11 pr-4 text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"

  return (
    <div className="ui-v2 relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-brand-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
          <BrandBlobs intensity={0.8} />
          <div className="absolute inset-0 bg-grid-white mask-fade-b" aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-fit rounded-2xl bg-white/95 px-5 py-3 shadow-xl"
          >
            <img src="/images/logo-flag-durango.png" alt="Flag Durango" className="h-12 w-auto" />
          </motion.div>
          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
              className="font-display text-7xl font-black uppercase italic leading-[0.9] tracking-tight text-white"
            >
              Bienvenido
              <span className="block text-brand-gradient pb-2">de vuelta</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
              className="mt-6 max-w-md text-lg text-white/75"
            >
              Administra tu equipo, consulta tu credencial y sigue cada jornada de la Liga Flag Durango.
            </motion.p>
          </div>
          <div className="brand-stripes relative h-1.5 w-40 rounded-full" />
        </div>

        <div className="relative flex items-center justify-center px-4 py-12">
          <BrandBlobs intensity={0.15} className="lg:hidden" />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-10"
          >
            <div className="brand-stripes absolute inset-x-0 top-0 h-1" aria-hidden />
            <img src="/images/logo-flag-durango.png" alt="Flag Durango" className="mb-6 h-10 w-auto lg:hidden" />
            <h2 className="font-display text-4xl font-extrabold uppercase italic tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-slate-500">Entra con tu correo o usuario</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Correo o Usuario</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="correo@ejemplo.com o usuario"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Contraseña</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <button type="submit" disabled={loading} className={`${brandButtonClass} w-full disabled:opacity-70`}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Entrando...
                  </>
                ) : (
                  <>
                    Entrar <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <div className="text-center text-sm text-slate-600">
                ¿Aún no tienes cuenta?{" "}
                <a href="/register-team" className="font-semibold text-brand-blue underline-offset-4 hover:underline">
                  Registra tu equipo
                </a>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
