"use client"

import { MovieResult } from "@/types/search"
import { useState, useCallback, useEffect } from "react"

// export interface Movie {
//   id: number
//   title: string
//   poster_path: string | null
//   backdrop_path?: string | null
//   rating?: number
//   year?: string
//   genre_ids?: number[]
//   availability?: "free" | "premium"
// }

export function useWatchlist() {
  const [movies, setMovies] = useState<MovieResult[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // --------------------------
  // FETCH FUNCTION
  // --------------------------
  const fetchPage = async (pageNumber: number) => {
    const res = await fetch(
      `/api/movies?genre=animation&page=${pageNumber}`
    )

    if (!res.ok) throw new Error("Failed to fetch")

    const data = await res.json()

    return {
      results: data.results ?? [],
      totalPages: data.totalPages ?? 1,
    }
  }

  // --------------------------
  // INITIAL LOAD
  // --------------------------
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { results, totalPages } = await fetchPage(1)

        if (!cancelled) {
          setMovies(results)
          setPage(1)
          setHasMore(1 < totalPages)
        }
      } catch (err) {
        // console.error(err)
        if (!cancelled) setMovies([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  // --------------------------
  // LOAD MORE (INFINITE SCROLL)
  // --------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return

    const nextPage = page + 1
    setLoadingMore(true)

    try {
      const { results, totalPages } = await fetchPage(nextPage)

      setMovies((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...prev, ...results.filter((m: MovieResult) => !ids.has(m.id))]
      })

      setPage(nextPage)
      setHasMore(nextPage < totalPages)
    } catch (err) {
      // console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }, [page, hasMore, loadingMore])

  // --------------------------
  // REMOVE FROM WATCHLIST
  // --------------------------
  const removeMovie = useCallback((id: string) => {
    setMovies((prev) => prev.filter((m) => m.id !== id))
  }, [])

  return {
    movies,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    removeMovie,
  }
}