"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
import { MovieResult } from "@/types/search"

const API = process.env.NEXT_PUBLIC_API_URL || ""

function buildUrl(q: string, page: number, filters: Filters): string {
  const p = new URLSearchParams()
  p.set("page", String(page))
  if (q)                                      p.set("q", q)
  if (filters.genres.length > 0)              p.set("genre", filters.genres.join(","))
  if (filters.minRating > 0)                  p.set("minRating", String(filters.minRating))
  if (filters.yearRange[0] !== MIN_YEAR)      p.set("yearFrom", String(filters.yearRange[0]))
  if (filters.yearRange[1] !== CURRENT_YEAR)  p.set("yearTo", String(filters.yearRange[1]))
  if (filters.sort)                           p.set("sort", filters.sort)
  return `${API}/movies/?${p}`
}

function isDefaultFilters(filters: Filters): boolean {
  return (
    filters.genres.length    === 0          &&
    filters.minRating        === 0          &&
    filters.yearRange[0]     === MIN_YEAR   &&
    filters.yearRange[1]     === CURRENT_YEAR
  )
}

export function useLibraryMovies(urlQuery: string, filters: Filters) {
  const [movies, setMovies]             = useState<MovieResult[]>([])
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [fetchError, setFetchError]     = useState(false)

  const [suggestions, setSuggestions]           = useState<MovieResult[]>([])
  const [suggPage, setSuggPage]                 = useState(1)
  const [suggTotalPages, setSuggTotalPages]     = useState(1)
  const [loadingMoreSugg, setLoadingMoreSugg]   = useState(false)

  const abortRef     = useRef<AbortController | null>(null)
  const abortSuggRef = useRef<AbortController | null>(null)

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  const isFiltered = !!urlQuery || !isDefaultFilters(filters)
  const hasMore    = page < totalPages

  const isEmpty    = !loading && !fetchError && movies.length === 0 && isFiltered

  // ── Main fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    const parsedFilters: Filters = JSON.parse(filtersKey)
    console.log(`useLibraryMovies: urlQuery="${urlQuery}", filters=${JSON.stringify(parsedFilters)}`)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setMovies([])
    setPage(1)
    setFetchError(false)

    const run = async () => {
      try {
        const url  = buildUrl(urlQuery, 1, parsedFilters)
        console.log("[library] fetch →", url)

        const res  = await fetch(url, { signal: ctrl.signal })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
        const data = await res.json()

        console.log("[library] got", data.results?.length, "results, totalPages:", data.totalPages)
        
        setMovies(data.results ?? [])
        setTotalPages(data.totalPages ?? 1)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.error("[library] fetch failed:", err)
        setFetchError(true)
        setMovies([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }

    const delay = urlQuery ? 300 : 0
    const t = setTimeout(run, delay)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [urlQuery, filtersKey])

  // Suggestions: on initial load + when search returns empty
  useEffect(() => {
    const shouldFetch = !isFiltered || isEmpty
    if (!shouldFetch) {
      setSuggestions([])
      return
    }

    abortSuggRef.current?.abort()
    const ctrl = new AbortController()
    abortSuggRef.current = ctrl

    fetch(`${API}/movies/?page=1`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        setSuggestions(data.results ?? [])
        setSuggPage(1)
        setSuggTotalPages(data.totalPages ?? 1)
      })
      .catch(() => {})

    return () => ctrl.abort()
  }, [isFiltered, isEmpty])

  // Load more (main)
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    const parsedFilters: Filters = JSON.parse(filtersKey)
    const next = page + 1
    setLoadingMore(true)
    try {
      const data = await fetch(buildUrl(urlQuery, next, parsedFilters)).then(r => r.json())
      setMovies(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setPage(next)
      setTotalPages(data.totalPages ?? totalPages)
    } catch {
      // silent — user can scroll again
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, totalPages, urlQuery, filtersKey])

  // Load more (suggestions) 
  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSugg || suggPage >= suggTotalPages) return
    const next = suggPage + 1
    setLoadingMoreSugg(true)
    try {
      const data = await fetch(`${API}/movies/?page=${next}`).then(r => r.json())
      setSuggestions(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setSuggPage(next)
      setSuggTotalPages(data.totalPages ?? suggTotalPages)
    } finally {
      setLoadingMoreSugg(false)
    }
  }, [loadingMoreSugg, suggPage, suggTotalPages])

  return {
    movies, loading, loadingMore, loadMore, hasMore,
    suggestions, isEmpty, isFiltered,
    loadMoreSuggestions, loadingMoreSugg,
    suggHasMore: suggPage < suggTotalPages,
    fetchError,
  }
}