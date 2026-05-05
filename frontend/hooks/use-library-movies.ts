"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MovieResult } from "@/types/search"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"

export function applyClientFilters(results: MovieResult[], filters: Filters): MovieResult[] {
  let out = [...results]

  if (filters.genres.length > 0)
    out = out.filter((m) =>
      Array.isArray(m.genre) && filters.genres.some((g) => m.genre!.includes(g))
    )

  if (filters.minRating > 0)
    out = out.filter((m) => (m.rating ?? 0) >= filters.minRating)

  if (filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR)
    out = out.filter((m) => {
      const y = Number(m.year ?? 0)
      return y >= filters.yearRange[0] && y <= filters.yearRange[1]
    })

  switch (filters.sort) {
    case "rating": out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
    case "newest": out.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0)); break
    case "oldest": out.sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0)); break
  }

  return out
}

function buildUrl(q: string, page: number, filters: Filters): string {
  if (!q && filters.genres.length > 0)
    return `/api/search?genre=${encodeURIComponent(filters.genres[0])}&page=${page}`
  if (q)
    return `/api/search?q=${encodeURIComponent(q)}&page=${page}`
  return `/api/movies/top?page=${page}`
}

export function useLibraryMovies(urlQuery: string, filters: Filters) {
  const [rawAccumulated, setRawAccumulated] = useState<MovieResult[]>([])
  const [page, setPage]                     = useState(1)
  const [totalPages, setTotalPages]         = useState(1)
  const [loading, setLoading]               = useState(false)
  const [loadingMore, setLoadingMore]       = useState(false)

  const [suggestions, setSuggestions]             = useState<MovieResult[]>([])
  const [suggPage, setSuggPage]                   = useState(1)
  const [suggTotalPages, setSuggTotalPages]        = useState(1)
  const [loadingMoreSugg, setLoadingMoreSugg]      = useState(false)

  const abortRef     = useRef<AbortController | null>(null)
  const abortSuggRef = useRef<AbortController | null>(null)

  const movies  = applyClientFilters(rawAccumulated, filters)
  const hasMore = page < totalPages

  // isEmpty = active search/genre filter returned nothing
  const isEmpty = !loading && movies.length === 0 && (!!urlQuery || filters.genres.length > 0)

  const suggHasMore = suggPage < suggTotalPages

  const suggst = applyClientFilters(suggestions, filters)

  // Fetch suggestions page 1 when isEmpty first becomes true 
  useEffect(() => {
    if (!isEmpty) 
    {
    //   Reset suggestions when leaving empty state so they're fresh next time
    //   setSuggestions([])
    //   setSuggPage(1)
    //   setSuggTotalPages(1)
      return
    }

    abortSuggRef.current?.abort()
    const controller = new AbortController()
    abortSuggRef.current = controller

    fetch("/api/movies/top?page=1", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setSuggestions((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
        setSuggPage(1)
        setSuggTotalPages(data.totalPages ?? 1)
      })
      .catch(() => {})

    return () => controller.abort()
  }, [isEmpty])

  //  Load more suggestions (called by InfiniteScroll in empty state) 
  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSugg || suggPage >= suggTotalPages) return
    const nextPage = suggPage + 1
    setLoadingMoreSugg(true)
    try {
      const res  = await fetch(`/api/movies/top?page=${nextPage}`)
      const data = await res.json()
      setSuggestions((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
      })
      setSuggPage(nextPage)
      setSuggTotalPages(data.totalPages ?? suggTotalPages)
    } catch {
      // silently fail
    } finally {
      setLoadingMoreSugg(false)
    }
  }, [loadingMoreSugg, suggPage, suggTotalPages])

  //  Main fetch — resets on query change 
  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const run = async () => {
      setLoading(true)
      setPage(1)
      setRawAccumulated([])
      try {
        const res  = await fetch(buildUrl(urlQuery, 1, filters), { signal: controller.signal })
        const data = await res.json()
        const raw  = (data.results ?? []).filter((r: MovieResult) => r.type === "movie")
        setRawAccumulated(raw)
        setTotalPages(data.totalPages ?? 1)
      } catch (err) {
        if ((err as Error).name !== "AbortError") setRawAccumulated([])
      } finally {
        setLoading(false)
      }
    }

    const t = setTimeout(run, urlQuery ? 300 : 0)
    return () => { clearTimeout(t); controller.abort() }
  }, [urlQuery, filters])

  //  Load more search results 
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res  = await fetch(buildUrl(urlQuery, nextPage, filters))
      const data = await res.json()
      const raw  = (data.results ?? []).filter((r: MovieResult) => r.type === "movie")
      setRawAccumulated((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        return [...prev, ...raw.filter((m: MovieResult) => !ids.has(m.id))]
      })
      setPage(nextPage)
      setTotalPages(data.totalPages ?? totalPages)
    } catch {
      // silently fail
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
    // suggestion-specific
    suggestions,
    isEmpty,
    loadMoreSuggestions,
    loadingMoreSugg,
    suggHasMore,
    suggst,
  }
}