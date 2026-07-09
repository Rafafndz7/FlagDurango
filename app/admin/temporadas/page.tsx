"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { Season } from "@/lib/seasons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [name, setName] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [message, setMessage] = useState("")

  const load = async () => {
    const response = await fetch("/api/seasons")
    const result = await response.json()
    if (result.success) setSeasons(result.data)
    else setMessage(result.message)
  }
  useEffect(() => { load() }, [])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    const response = await fetch("/api/seasons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, year, status: "draft" }),
    })
    const result = await response.json()
    setMessage(result.success ? "Temporada creada como borrador." : result.message)
    if (result.success) { setName(""); await load() }
  }
  const action = async (id: string, action: "activate" | "archive") => {
    const response = await fetch("/api/seasons", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    })
    const result = await response.json()
    setMessage(result.success ? `Temporada ${action === "activate" ? "activada" : "archivada"}.` : result.message)
    await load()
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Temporadas</h1><p className="text-gray-600">Historial y temporada activa de la liga.</p></div>
        <Button asChild variant="outline"><Link href="/admin">Volver al admin</Link></Button>
      </div>
      {message && <p className="rounded-lg bg-blue-50 p-3 text-blue-800">{message}</p>}
      <Card>
        <CardHeader><CardTitle>Crear temporada</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
            <Input required placeholder="Ej. Temporada Primavera 2026" value={name} onChange={(e) => setName(e.target.value)} />
            <Input required type="number" min="2025" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <Button type="submit">Crear borrador</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {seasons.map((season) => (
          <Card key={season.id}>
            <CardContent className="flex flex-col justify-between gap-4 pt-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{season.name}</h2>
                  <Badge variant={season.is_active ? "default" : "secondary"}>{season.is_active ? "Activa" : season.status}</Badge>
                </div>
                <p className="text-sm text-gray-600">{season.year} · {season.game_count || 0} juegos</p>
              </div>
              <div className="flex gap-2">
                {!season.is_active && <Button onClick={() => action(season.id, "activate")}>Activar</Button>}
                {season.status !== "archived" && <Button variant="outline" onClick={() => action(season.id, "archive")}>Archivar</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
