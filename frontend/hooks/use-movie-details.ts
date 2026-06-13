import { MovieDetail } from "@/types/movie"
import { useEffect, useState } from "react"
import { useLanguage } from "@/hooks/use-language"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
type DetailStatus = "loading" | "pending" | "ready" | "not_found" | "error"

export function useMovieDetail(movieId: string) {
  const [data,    setData]    = useState<MovieDetail | null>(null)
  const [status, setStatus] = useState<DetailStatus>("loading")
  const { langCode } = useLanguage()

  useEffect(() => {
    if (!movieId) return
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout>
    let controller: AbortController | null = null

    async function load() {
      controller?.abort()
      controller = new AbortController()

      try {
        setData(null)
        setStatus(prev => (prev === "pending" ? "pending" : "loading"))

        const res = await fetch(`${API}/movies/${movieId}/?lang=${langCode}`, {
          signal: controller.signal,
        })
        if (res.status === 404) {
          if (!cancelled) {
            setData(null)
            setStatus("not_found")
          }
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (cancelled) return

        if (json._pending) {
          setData(json)
          setStatus("pending")
          pollTimer = setTimeout(load, 3000)
        } else {
          setData(json)
          setStatus("ready")
        }
      } catch (err) {
        if (cancelled || (err as Error).name === "AbortError") return
        setData(null)
        setStatus("error")
      }
    }

    load()
    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      controller?.abort()
    }
  }, [movieId, langCode])

  return {
    data,
    status,
    pending: status === "loading" || status === "pending",
    error: status === "error",
    notFound: status === "not_found",
  }
}
