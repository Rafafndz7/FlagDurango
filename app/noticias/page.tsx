"use client"

import { useState, useEffect } from "react"
import { Calendar, User } from "lucide-react"
import { BrandLoader, PageHero } from "@/components/ui-v2/brand"
import { HoverLift, Stagger, StaggerItem } from "@/components/ui-v2/motion"

interface NewsArticle {
  id: number
  title: string
  content: string
  author: string
  published_at: string
  image_url?: string
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate fetching news data
    const fetchNews = async () => {
      setLoading(true)
      setError(null)
      try {
        // In a real app, you'd fetch from an API:
        // const response = await fetch('/api/news');
        // const data = await response.json();
        // if (data.success) {
        //   setNews(data.data);
        // } else {
        //   setError(data.message || "Error al cargar noticias.");
        // }

        // Mock data for now
        const mockNews: NewsArticle[] = [
          {
            id: 1,
            title: "¡Gran Inauguración de la Temporada 2025!",
            content:
              "La Liga Flag Durango dio inicio a su temporada 2025 con una ceremonia espectacular y partidos emocionantes. Equipos de todas las categorías demostraron su talento y pasión por el flag football.",
            author: "Admin Liga",
            published_at: "2025-07-10T10:00:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
          },
          {
            id: 2,
            title: "Entrevista Exclusiva con el Capitán de los 'Dragones'",
            content:
              "Hablamos con el capitán del equipo 'Dragones', campeón defensor, sobre sus expectativas para la nueva temporada y los desafíos que enfrentarán.",
            author: "Reportero Deportivo",
            published_at: "2025-07-08T14:30:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
          },
          {
            id: 3,
            title: "Clínica de Flag Football para Jóvenes Talentos",
            content:
              "La liga organizó una clínica gratuita para niños y jóvenes, fomentando el deporte y descubriendo futuras promesas del flag football en Durango.",
            author: "Coordinación de Eventos",
            published_at: "2025-07-05T09:00:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
          },
          {
            id: 4,
            title: "Resultados Destacados de la Jornada 1",
            content:
              "Un resumen de los partidos más emocionantes y los resultados sorprendentes de la primera jornada de la temporada.",
            author: "Estadísticas Liga",
            published_at: "2025-07-12T18:00:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
          },
        ]
        setNews(mockNews.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()))
      } catch (err) {
        console.error("Error fetching news:", err)
        setError("Error de red o del servidor al cargar noticias.")
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [])

  if (loading) {
    return <BrandLoader label="Cargando noticias…" />
  }

  if (error) {
    return (
      <div className="ui-v2 flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-3xl bg-red-50 px-8 py-6 text-center text-lg font-semibold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="ui-v2 min-h-screen bg-slate-50">
      <PageHero
        compact
        eyebrow="Liga Flag Durango"
        title="Últimas"
        highlight="Noticias"
        description="Mantente al día con todo lo que sucede en la Liga Flag Durango."
      />

      <div className="container mx-auto px-4 py-14">
        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((article) => (
            <StaggerItem key={article.id} className="h-full">
              <HoverLift className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-2xl">
                {article.image_url && (
                  <div className="relative h-52 w-full overflow-hidden">
                    <img
                      src={article.image_url || "/placeholder.svg"}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
                    <div className="brand-stripes absolute inset-x-0 bottom-0 h-1" aria-hidden />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h2 className="line-clamp-2 text-xl font-bold leading-snug text-slate-900">{article.title}</h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{article.content}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-brand-pink" />
                      {article.author}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-brand-blue" />
                      {new Date(article.published_at).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>
        {news.length === 0 && (
          <p className="mt-8 text-center text-lg text-slate-600">No hay noticias disponibles en este momento.</p>
        )}
      </div>
    </div>
  )
}
