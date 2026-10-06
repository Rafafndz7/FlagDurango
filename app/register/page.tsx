"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { BrandBlobs, brandButtonClass } from "@/components/ui-v2/brand"
import { EASE_OUT } from "@/components/ui-v2/motion"

const POSITIONS = [
  "QB", "WR", "RB", "OL", "DL", "LB", "DB", "K", "TE", "S", "CB", "C", "DE", "DT"
]

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<"coach" | "player">("player")
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Player-specific fields
    playerName: "",
    position: "QB",
    jerseyNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (formData.password !== formData.confirmPassword) {
      setMessage("Las contrasenas no coinciden.")
      setMessageType("error")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setMessage("La contrasena debe tener al menos 6 caracteres.")
      setMessageType("error")
      setLoading(false)
      return
    }

    if (accountType === "player") {
      if (!formData.playerName.trim()) {
        setMessage("El nombre completo es requerido.")
        setMessageType("error")
        setLoading(false)
        return
      }
      const num = parseInt(formData.jerseyNumber, 10)
      if (!num || num < 1 || num > 99) {
        setMessage("El numero de jersey debe ser entre 1 y 99.")
        setMessageType("error")
        setLoading(false)
        return
      }
    }

    try {
      const body: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: accountType,
      }

      if (accountType === "player") {
        body.playerName = formData.playerName.trim()
        body.position = formData.position
        body.jerseyNumber = parseInt(formData.jerseyNumber, 10)
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        setMessageType("success")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setMessage(data.message)
        setMessageType("error")
      }
    } catch {
      setMessage("Error de conexion. Intenta de nuevo.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }


  const inputClass =
    "h-12 w-full rounded-2xl border-0 bg-slate-100 px-4 text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700"

  return (
    <div className="ui-v2 relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-brand-ink px-4 py-12">
      <BrandBlobs intensity={0.8} />
      <div className="absolute inset-0 bg-grid-white mask-fade-b" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl md:p-10"
      >
        <div className="brand-stripes absolute inset-x-0 top-0 h-1" aria-hidden />
        <img src="/images/logo-flag-durango.png" alt="Flag Durango" className="mx-auto mb-5 h-12 w-auto" />
        <h1 className="text-center font-display text-4xl font-extrabold uppercase italic tracking-tight text-slate-900">
          Crear Cuenta
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">Unete a Liga Flag Durango</p>

        <div className="mb-6 mt-8">
          <span className={labelClass}>Tipo de cuenta</span>
          <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1 ring-1 ring-slate-200">
            {[
              { value: "player" as const, label: "Jugador" },
              { value: "coach" as const, label: "Coach" },
            ].map((opt) => {
              const active = accountType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccountType(opt.value)}
                  className={`relative rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                    active ? "text-white" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="register-account-type"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-brand"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className={labelClass}>
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Tu nombre de usuario"
              value={formData.username}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          <AnimatePresence initial={false}>
            {accountType === "player" && (
              <motion.div
                key="player-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label htmlFor="playerName" className={labelClass}>
                    Nombre completo
                  </label>
                  <input
                    id="playerName"
                    name="playerName"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.playerName}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="position" className={labelClass}>
                      Posicion
                    </label>
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="jerseyNumber" className={labelClass}>
                      No. Jersey
                    </label>
                    <input
                      id="jerseyNumber"
                      name="jerseyNumber"
                      type="number"
                      min={1}
                      max={99}
                      placeholder="1-99"
                      value={formData.jerseyNumber}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label htmlFor="password" className={labelClass}>
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirmar Contrasena
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contrasena"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ring-1 ${
                  messageType === "success"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-red-200"
                }`}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className={`${brandButtonClass} w-full disabled:opacity-70`} disabled={loading}>
            {loading ? "Registrando..." : accountType === "player" ? "Crear Cuenta de Jugador" : "Crear Cuenta de Coach"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-600">
          {"Ya tienes cuenta? "}
          <Link href="/login" className="font-semibold text-brand-blue underline-offset-4 hover:underline">
            Inicia sesion
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

