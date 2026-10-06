"use client"

import { motion } from "framer-motion"
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { BrandBlobs, BrandStripes } from "./brand"

export function SiteFooter() {
  return (
    <footer className="ui-v2 relative isolate overflow-hidden bg-brand-ink text-slate-300">
      <BrandBlobs intensity={0.35} />
      <BrandStripes className="h-1.5" />
      <div className="container relative mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="flex flex-col items-start">
            <img src="/images/20.png" alt="20 Años de Flag" className="mb-5 h-auto w-40 drop-shadow-xl" />
            <p className="text-sm text-slate-400">21 años promoviendo el flag football en Durango.</p>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-extrabold uppercase italic tracking-wide text-white">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Phone className="h-4 w-4 text-brand-orange" />
                </span>
                (618) 328 8280
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Mail className="h-4 w-4 text-brand-pink" />
                </span>
                flagdurango@gmail.com
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <MapPin className="h-4 w-4 text-sky-400" />
                </span>
                C. Guadalupe 749, Zona Centro, 34000. Durango, Dgo
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-extrabold uppercase italic tracking-wide text-white">
              Links
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "https://wild-studio.mx/", label: "WildStudio" },
                { href: "https://www.facebook.com/profile.php?id=61576406477003", label: "WildSports" },
                { href: "https://www.facebook.com/axisflagfootball", label: "Axis Flag Football" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 transition-colors hover:text-white"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient transition-transform group-hover:scale-150" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-extrabold uppercase italic tracking-wide text-white">
              Síguenos
            </h3>
            <div className="flex gap-3">
              {[
                { href: "https://wa.me/526183288280", Icon: MessageCircle, hover: "hover:bg-green-500", label: "WhatsApp" },
                {
                  href: "https://www.facebook.com/share/1AfHDmwRku/?mibextid=wwXIfr",
                  Icon: Facebook,
                  hover: "hover:bg-brand-blue",
                  label: "Facebook",
                },
                {
                  href: "https://www.instagram.com/flag.durango?igsh=aW5jNzVlZTU1YXFy",
                  Icon: Instagram,
                  hover: "hover:bg-brand-pink",
                  label: "Instagram",
                },
              ].map(({ href, Icon, hover, label }) => (
                <motion.a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  whileHover={{ y: -4, scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors ${hover}`}
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl">
          <div className="bg-brand-gradient-animated py-4 text-center text-sm font-semibold tracking-wide text-white">
            FLAGDURANGO.COM.MX / CREADO POR RafaFndz
          </div>
        </div>
      </div>
    </footer>
  )
}
