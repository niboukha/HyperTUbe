"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MovieResult } from "@/types/search"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"

// Build URL with ALL filters pushed to server
function buildUrl(q: string, page: number, filters: Filters): string {
  const p = new URLSearchParams()
  p.set("page", String(page))

  if (q) {
    p.set("q", q)
    return `/api/movies?${p}`
  }

  // Genre filter -> server-side discover
  if (filters.genres.length > 0) {
    p.set("genre", filters.genres[0]) // TMDB genre ID
  }

  // Rating filter -> server-side
  if (filters.minRating > 0) {
    p.set("minRating", String(filters.minRating))
  }

  // Year range -> server-side
  if (filters.yearRange[0] !== MIN_YEAR) {
    p.set("yearFrom", String(filters.yearRange[0]))
  }
  if (filters.yearRange[1] !== CURRENT_YEAR) {
    p.set("yearTo", String(filters.yearRange[1]))
  }

  // Sort -> server-side
  const sortMap: Record<string, string> = {
    popular: "popularity.desc",
    rating:  "vote_average.desc",
    newest:  "primary_release_date.desc",
    oldest:  "primary_release_date.asc",
  }
  if (filters.sort && sortMap[filters.sort]) {
    p.set("sort", sortMap[filters.sort])
  }

  return `/api/movies?${p}`
}

export function useLibraryMovies(urlQuery: string, filters: Filters) {
  const [movies, setMovies]         = useState<MovieResult[]>([])
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]       = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Suggestions shown when main results are empty
  const [suggestions, setSuggestions]       = useState<MovieResult[]>([])
  const [suggPage, setSuggPage]             = useState(1)
  const [suggTotalPages, setSuggTotalPages] = useState(1)
  const [loadingMoreSugg, setLoadingMoreSugg] = useState(false)

  const abortRef     = useRef<AbortController | null>(null)
  const abortSuggRef = useRef<AbortController | null>(null)

  const hasMore = page < totalPages
  const isEmpty = !loading && movies.length === 0 && (!!urlQuery || filters.genres.length > 0)
  const suggHasMore = suggPage < suggTotalPages

  // ── Suggestions when main results empty ────────────────────────────────
  useEffect(() => {
    if (!isEmpty) return

    abortSuggRef.current?.abort()
    const ctrl = new AbortController()
    abortSuggRef.current = ctrl

    fetch("/api/movies?page=1", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        setSuggestions((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
        setSuggPage(1)
        setSuggTotalPages(data.totalPages ?? 1)
      })
      .catch(() => {})

    return () => ctrl.abort()
  }, [isEmpty])

  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSugg || suggPage >= suggTotalPages) return
    const next = suggPage + 1
    setLoadingMoreSugg(true)
    try {
      const data = await fetch(`/api/movies?page=${next}`).then((r) => r.json())
      setSuggestions((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setSuggPage(next)
      setSuggTotalPages(data.totalPages ?? suggTotalPages)
    } finally {
      setLoadingMoreSugg(false)
    }
  }, [loadingMoreSugg, suggPage, suggTotalPages])

  // ── Main fetch — resets when query or filters change ───────────────────
  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const run = async () => {
      setLoading(true)
      setMovies([])
      setPage(1)
      try {
        const data = await fetch(buildUrl(urlQuery, 1, filters), {
          signal: ctrl.signal,
        }).then((r) => r.json())

        setMovies((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
        setTotalPages(data.totalPages ?? 1)
      } catch (err) {
        if ((err as Error).name !== "AbortError") setMovies([])
      } finally {
        setLoading(false)
      }
    }

    const t = setTimeout(run, urlQuery ? 300 : 0)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [urlQuery, filters])

  // ── Load more ──────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    const next = page + 1
    setLoadingMore(true)
    try {
      const data = await fetch(buildUrl(urlQuery, next, filters)).then((r) => r.json())
      setMovies((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setPage(next)
      setTotalPages(data.totalPages ?? totalPages)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, totalPages, urlQuery, filters])

  return {
    movies,
    loading,
    loadingMore,
    loadMore,
    hasMore,
    page,
    totalPages,
    suggestions,
    isEmpty,
    loadMoreSuggestions,
    loadingMoreSugg,
    suggHasMore,
  }
}