"use client"

import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  x?: number
  once?: boolean
}

/** Aparece con fade + desplazamiento al entrar en pantalla */
export function Reveal({ children, className, delay = 0, y = 24, x = 0, once = true }: RevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.65, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  show: (stagger: number = 0.07) => ({ transition: { staggerChildren: stagger } }),
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
}

/** Contenedor que anima a sus <StaggerItem> uno tras otro */
export function Stagger({
  children,
  className,
  stagger = 0.07,
  once = true,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  once?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      custom={stagger}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}

/** Tarjeta que se eleva al pasar el mouse */
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -6 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  )
}

/** Número que cuenta desde 0 al entrar en pantalla */
export function CountUp({ value, className, duration = 1.4 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduce])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("es-MX")}
    </span>
  )
}
