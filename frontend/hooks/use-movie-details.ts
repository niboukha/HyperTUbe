import { useEffect, useState } from "react"
import { getMovieDetails } from "@/lib/utils/fetchMovies"

export function useMovieDetails(movieId: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!movieId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setData(null)

      try {
        const res = await getMovieDetails(movieId)

        if (!cancelled) {
          setData(res)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [movieId])
  return {
    data,
    loading,
  }
}