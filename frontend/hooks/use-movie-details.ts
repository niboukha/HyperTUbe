import { MovieDetail } from "@/types/movie"
import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export function useMovieDetail(movieId: string) {
  const [data,    setData]    = useState<MovieDetail | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!movieId) return
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout>

    async function load() {
      const res  = await fetch(`${API}/movies/${movieId}/`)
      const json = await res.json()
      if (cancelled) return

      if (json._pending) {
        setPending(true)
        setData(json)
        // Poll every 3s until real data arrives
        pollTimer = setTimeout(load, 3000)
      } else {
        setPending(false)
        setData(json)
      }
    }

    load()
    return () => { cancelled = true; clearTimeout(pollTimer) }
  }, [movieId])

  return { data, pending }
}