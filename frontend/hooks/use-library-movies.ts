"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
import { MovieResult } from "@/types/search"

const API = process.env.NEXT_PUBLIC_API_URL || ""

const SORT_MAP: Record<string, string> = {
  popular: "popular",
  rating:  "rating",
  newest:  "newest",
  oldest:  "oldest",
  name:    "name",
}

function buildUrl(q: string, page: number, filters: Filters): string {
  const p = new URLSearchParams()
  p.set("page", String(page))
  if (q)                                      p.set("q", q)
  if (filters.genres.length > 0)              p.set("genre", filters.genres.join(","))
  if (filters.minRating > 0)                  p.set("minRating", String(filters.minRating))
  if (filters.yearRange[0] !== MIN_YEAR)      p.set("yearFrom", String(filters.yearRange[0]))
  if (filters.yearRange[1] !== CURRENT_YEAR)  p.set("yearTo", String(filters.yearRange[1]))
  if (filters.sort)                           p.set("sort", SORT_MAP[filters.sort] ?? filters.sort)
  return `${API}/movies/?${p}`
}

function isDefaultFilters(f: Filters): boolean {
  return (
    f.genres.length === 0       &&
    f.minRating     === 0       &&
    f.yearRange[0]  === MIN_YEAR &&
    f.yearRange[1]  === CURRENT_YEAR
  )
}

export function useLibraryMovies(urlQuery: string, filters: Filters) {
  const [movies,      setMovies]      = useState<MovieResult[]>([])
  const [page,        setPage]        = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState(false)
  const [suggestions, setSuggestions] = useState<MovieResult[]>([])
  const [suggPage, setSuggPage] = useState(1)
  const [suggTotalPages, setSuggTotalPages] = useState(1)
  const [loadingMoreSugg, setLoadingMoreSugg] = useState(false)

  const abortRef    = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersKey  = useMemo(() => JSON.stringify(filters), [filters])

  const isFiltered = !!urlQuery || !isDefaultFilters(filters)
  const hasMore    = page < totalPages
  const isEmpty    = !loading && !error && movies.length === 0 && isFiltered
  const suggHasMore = suggPage < suggTotalPages

  // Page 1: fires when query or filters change
  useEffect(() => {
    const f = JSON.parse(filtersKey) as Filters

    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const run = async () => {
      setLoading(true)
      setMovies([])
      setSuggestions([])
      setSuggPage(1)
      setSuggTotalPages(1)
      setPage(1)
      setError(false)

      try {
        const res  = await fetch(buildUrl(urlQuery, 1, f), { signal: ctrl.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setMovies(data.results ?? [])
        setTotalPages(data.totalPages ?? 1)
        setTotal(data.total ?? data.results?.length ?? 0)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError(true)
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }

    // Debounce typing — don't fetch on every keystroke
    debounceRef.current = setTimeout(run, urlQuery ? 400 : 0)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      ctrl.abort()
    }
  }, [urlQuery, filtersKey])

  const fetchSuggestions = useCallback(async (nextPage: number) => {
    const suggestionFilters: Filters = {
      genres: [],
      sort: "rating",
      minRating: 0,
      yearRange: [MIN_YEAR, CURRENT_YEAR],
    }
    const res = await fetch(buildUrl("", nextPage, suggestionFilters))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  useEffect(() => {
    if (!isEmpty || suggestions.length > 0) return

    let cancelled = false

    async function loadInitialSuggestions() {
      setLoadingMoreSugg(true)
      try {
        const data = await fetchSuggestions(1)
        if (cancelled) return
        setSuggestions(data.results ?? [])
        setSuggPage(1)
        setSuggTotalPages(data.totalPages ?? 1)
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setSuggTotalPages(1)
        }
      } finally {
        if (!cancelled) setLoadingMoreSugg(false)
      }
    }

    loadInitialSuggestions()
    return () => {
      cancelled = true
    }
  }, [isEmpty, suggestions.length, fetchSuggestions])

  // Load next page — infinite scroll
  // Pages 2+ are instant because backend slices from cached full list
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    const f    = JSON.parse(filtersKey) as Filters
    const next = page + 1
    setLoadingMore(true)
    try {
      const res  = await fetch(buildUrl(urlQuery, next, f))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMovies(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setPage(next)
      setTotalPages(data.totalPages ?? totalPages)
    } catch {
      // silent user can scroll again to retry
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, totalPages, urlQuery, filtersKey])

  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSugg || suggPage >= suggTotalPages) return
    const next = suggPage + 1
    setLoadingMoreSugg(true)
    try {
      const data = await fetchSuggestions(next)
      setSuggestions(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setSuggPage(next)
      setSuggTotalPages(data.totalPages ?? suggTotalPages)
    } catch {
      // keep the current suggestions; user can scroll again to retry
    } finally {
      setLoadingMoreSugg(false)
    }
  }, [loadingMoreSugg, suggPage, suggTotalPages, fetchSuggestions])

  return {
    movies, loading, loadingMore, loadMore,
    hasMore, isEmpty, isFiltered, error,
    total, totalPages, page,
    suggestions, loadMoreSuggestions, loadingMoreSugg, suggHasMore,
  }
}
