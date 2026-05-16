// hooks/use-library-movies.ts
"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
import { MovieResult } from "@/types/search"

const API = process.env.NEXT_PUBLIC_API_URL || ""

// ── URL builders ──────────────────────────────────────────────────────────────

function buildStreamUrl(q: string, page: number, filters: Filters): string {
  const p = new URLSearchParams()
  p.set("page", String(page))
  if (q)                                     p.set("q", q)
  if (filters.genres.length > 0)             p.set("genre", filters.genres.join(","))
  if (filters.minRating > 0)                 p.set("minRating", String(filters.minRating))
  if (filters.yearRange[0] !== MIN_YEAR)     p.set("yearFrom", String(filters.yearRange[0]))
  if (filters.yearRange[1] !== CURRENT_YEAR) p.set("yearTo", String(filters.yearRange[1]))
  if (filters.sort)                          p.set("sort", filters.sort)
  return `${API}/movies/stream/?${p}`
}

function buildUrl(q: string, page: number, filters: Filters): string {
  const p = new URLSearchParams()
  p.set("page", String(page))
  if (q)                                     p.set("q", q)
  if (filters.genres.length > 0)             p.set("genre", filters.genres.join(","))
  if (filters.minRating > 0)                 p.set("minRating", String(filters.minRating))
  if (filters.yearRange[0] !== MIN_YEAR)     p.set("yearFrom", String(filters.yearRange[0]))
  if (filters.yearRange[1] !== CURRENT_YEAR) p.set("yearTo", String(filters.yearRange[1]))
  if (filters.sort)                          p.set("sort", filters.sort)
  return `${API}/movies/?${p}`
}

function isDefaultFilters(filters: Filters): boolean {
  return (
    filters.genres.length === 0          &&
    filters.minRating     === 0          &&
    filters.yearRange[0]  === MIN_YEAR   &&
    filters.yearRange[1]  === CURRENT_YEAR
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLibraryMovies(urlQuery: string, filters: Filters) {
  const [movies,       setMovies]       = useState<MovieResult[]>([])
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [fetchError,   setFetchError]   = useState(false)
  const [archiveReady, setArchiveReady] = useState(false)

  const [suggestions,     setSuggestions]     = useState<MovieResult[]>([])
  const [suggPage,        setSuggPage]        = useState(1)
  const [suggTotalPages,  setSuggTotalPages]  = useState(1)
  const [loadingMoreSugg, setLoadingMoreSugg] = useState(false)

  const esRef        = useRef<EventSource | null>(null)
  const abortSuggRef = useRef<AbortController | null>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable serialized key — prevents object reference churn in deps
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  const isFiltered = !!urlQuery || !isDefaultFilters(filters)
  const hasMore    = page < totalPages
  const isEmpty    = !loading && !fetchError && movies.length === 0 && isFiltered

  // ── Page 1 — SSE stream (TMDB fast + archive when ready) ─────────────────
  useEffect(() => {
    const parsedFilters: Filters = JSON.parse(filtersKey)

    // Close previous SSE connection
    esRef.current?.close()
    esRef.current = null

    // Clear debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    setLoading(true)
    setMovies([])
    setPage(1)
    setTotalPages(1)
    setFetchError(false)
    setArchiveReady(false)

    const open = () => {
      const url = buildStreamUrl(urlQuery, 1, parsedFilters)
      console.log("[library] SSE →", url)

      // EventSource doesn't support AbortController — manage manually
      const es = new EventSource(url)
      esRef.current = es

      // Phase 1: TMDB — show immediately
      es.addEventListener("tmdb", (e) => {
        try {
          const data = JSON.parse(e.data)
          setMovies(data.results ?? [])
          setTotalPages(data.totalPages ?? 1)
          setLoading(false)
          console.log("[library] TMDB arrived:", data.results?.length, "results")
        } catch { /* ignore parse errors */ }
      })

      // Phase 2: Archive — merge in without resetting scroll position
      // es.addEventListener("archive", (e) => {
      //   try {
      //     const data           = JSON.parse(e.data)
      //     const archiveResults: MovieResult[] = data.results ?? []
      //     setArchiveReady(true)

      //     if (archiveResults.length > 0) {
      //       setMovies(prev => {
      //         const ids   = new Set(prev.map(m => m.id))
      //         const fresh = archiveResults.filter(m => !ids.has(m.id))
      //         if (fresh.length === 0) return prev

      //         // Insert archive results at random positions — feels organic
      //         const merged = [...prev]
      //         fresh.forEach(item => {
      //           const pos = Math.floor(Math.random() * (merged.length + 1))
      //           merged.splice(pos, 0, item)
      //         })
      //         console.log("[library] Archive merged:", fresh.length, "new results")
      //         return merged
      //       })
      //     }
      //   } catch { /* ignore parse errors */ }
      // })

      es.addEventListener("archive", (e) => {
        try {
          const data           = JSON.parse(e.data)
          const archiveResults: MovieResult[] = data.results ?? []
          setArchiveReady(true)

          if (archiveResults.length > 0) {
            setMovies(prev => {
              const ids   = new Set(prev.map(m => m.id))
              const fresh = archiveResults.filter(m => !ids.has(m.id))
              if (fresh.length === 0) return prev
              // append at end — no position juggling, no re-render flash
              return [...prev, ...fresh]
            })
          }
        } catch { }
      })

      es.addEventListener("done", () => {
        console.log("[library] SSE done")
        es.close()
        esRef.current = null
      })

      es.onerror = (err) => {
        console.error("[library] SSE error:", err)
        setLoading(false)

        // If SSE fails entirely, fall back to regular fetch
        if (es.readyState === EventSource.CLOSED) {
          esRef.current = null
          _fallbackFetch(urlQuery, 1, parsedFilters)
        }
      }
    }

    // Debounce text search to avoid SSE on every keystroke
    const delay = urlQuery ? 350 : 0
    debounceRef.current = setTimeout(open, delay)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      esRef.current?.close()
      esRef.current = null
    }
  }, [urlQuery, filtersKey])

  // Fallback if SSE not supported or fails
  const _fallbackFetch = async (q: string, pg: number, f: Filters) => {
    try {
      const res  = await fetch(buildUrl(q, pg, f))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMovies(data.results ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch (err) {
      console.error("[library] fallback fetch failed:", err)
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  // ── Suggestions: shown on initial load OR when search is empty ───────────
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

  // ── Load more — pages 2+ use regular REST (archive already in page 1) ────
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    const parsedFilters: Filters = JSON.parse(filtersKey)
    const next = page + 1
    setLoadingMore(true)
    try {
      const data = await fetch(buildUrl(urlQuery, next, parsedFilters)).then(r => r.json())
      setMovies(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [
          ...prev,
          ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id)),
        ]
      })
      setPage(next)
      setTotalPages(data.totalPages ?? totalPages)
    } catch {
      // silent — user can scroll again
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, totalPages, urlQuery, filtersKey])

  // ── Load more suggestions ─────────────────────────────────────────────────
  const loadMoreSuggestions = useCallback(async () => {
    if (loadingMoreSugg || suggPage >= suggTotalPages) return
    const next = suggPage + 1
    setLoadingMoreSugg(true)
    try {
      const data = await fetch(`${API}/movies/?page=${next}`).then(r => r.json())
      setSuggestions(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [
          ...prev,
          ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id)),
        ]
      })
      setSuggPage(next)
      setSuggTotalPages(data.totalPages ?? suggTotalPages)
    } finally {
      setLoadingMoreSugg(false)
    }
  }, [loadingMoreSugg, suggPage, suggTotalPages])

  return {
    movies,
    loading,
    loadingMore,
    loadMore,
    hasMore,
    archiveReady,
    suggestions,
    isEmpty,
    isFiltered,
    loadMoreSuggestions,
    loadingMoreSugg,
    suggHasMore: suggPage < suggTotalPages,
    fetchError,
  }
}

// "use client"

// import { useState, useEffect, useRef, useCallback, useMemo } from "react"
// import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
// import { MovieResult } from "@/types/search"

// const API = process.env.NEXT_PUBLIC_API_URL || ""

// function buildUrl(q: string, page: number, filters: Filters): string {
//   const p = new URLSearchParams()
//   p.set("page", String(page))
//   if (q)                                      p.set("q", q)
//   if (filters.genres.length > 0)              p.set("genre", filters.genres.join(","))
//   if (filters.minRating > 0)                  p.set("minRating", String(filters.minRating))
//   if (filters.yearRange[0] !== MIN_YEAR)      p.set("yearFrom", String(filters.yearRange[0]))
//   if (filters.yearRange[1] !== CURRENT_YEAR)  p.set("yearTo", String(filters.yearRange[1]))
//   if (filters.sort)                           p.set("sort", filters.sort)
//   return `${API}/movies/?${p}`
// }

// function isDefaultFilters(filters: Filters): boolean {
//   return (
//     filters.genres.length    === 0          &&
//     filters.minRating        === 0          &&
//     filters.yearRange[0]     === MIN_YEAR   &&
//     filters.yearRange[1]     === CURRENT_YEAR
//   )
// }

// export function useLibraryMovies(urlQuery: string, filters: Filters) {
//   const [movies, setMovies]             = useState<MovieResult[]>([])
//   const [page, setPage]                 = useState(1)
//   const [totalPages, setTotalPages]     = useState(1)
//   const [loading, setLoading]           = useState(true)
//   const [loadingMore, setLoadingMore]   = useState(false)
//   const [fetchError, setFetchError]     = useState(false)

//   const [suggestions, setSuggestions]           = useState<MovieResult[]>([])
//   const [suggPage, setSuggPage]                 = useState(1)
//   const [suggTotalPages, setSuggTotalPages]     = useState(1)
//   const [loadingMoreSugg, setLoadingMoreSugg]   = useState(false)

//   const abortRef     = useRef<AbortController | null>(null)
//   const abortSuggRef = useRef<AbortController | null>(null)

//   const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

//   const isFiltered = !!urlQuery || !isDefaultFilters(filters)
//   const hasMore    = page < totalPages

//   const isEmpty    = !loading && !fetchError && movies.length === 0 && isFiltered

//   // Main fetch
//   useEffect(() => {
//     const parsedFilters: Filters = JSON.parse(filtersKey)
//     console.log(`useLibraryMovies: urlQuery="${urlQuery}", filters=${JSON.stringify(parsedFilters)}`)

//     abortRef.current?.abort()
//     const ctrl = new AbortController()
//     abortRef.current = ctrl

//     setLoading(true)
//     setMovies([])
//     setPage(1)
//     setFetchError(false)

//     const run = async () => {
//       try {
//         const url  = buildUrl(urlQuery, 1, parsedFilters)
//         console.log("[library] fetch →", url)

//         const res  = await fetch(url, { signal: ctrl.signal })

//         if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
//         const data = await res.json()

//         console.log("[library] got", data.results?.length, "results, totalPages:", data.totalPages)
        
//         setMovies(data.results ?? [])
//         setTotalPages(data.totalPages ?? 1)
//       } catch (err) {
//         if ((err as Error).name === "AbortError") return
//         console.error("[library] fetch failed:", err)
//         setFetchError(true)
//         setMovies([])
//       } finally {
//         if (!ctrl.signal.aborted) setLoading(false)
//       }
//     }

//     const delay = urlQuery ? 300 : 0
//     const t = setTimeout(run, delay)
//     return () => { clearTimeout(t); ctrl.abort() }
//   }, [urlQuery, filtersKey])

//   // Suggestions: on initial load + when search returns empty
//   useEffect(() => {
//     const shouldFetch = !isFiltered || isEmpty
//     if (!shouldFetch) {
//       setSuggestions([])
//       return
//     }

//     abortSuggRef.current?.abort()
//     const ctrl = new AbortController()
//     abortSuggRef.current = ctrl

//     fetch(`${API}/movies/?page=1`, { signal: ctrl.signal })
//       .then(r => r.json())
//       .then(data => {
//         setSuggestions(data.results ?? [])
//         setSuggPage(1)
//         setSuggTotalPages(data.totalPages ?? 1)
//       })
//       .catch(() => {})

//     return () => ctrl.abort()
//   }, [isFiltered, isEmpty])

//   // Load more (main)
//   const loadMore = useCallback(async () => {
//     if (loadingMore || page >= totalPages) return
//     const parsedFilters: Filters = JSON.parse(filtersKey)
//     const next = page + 1
//     setLoadingMore(true)
//     try {
//       const data = await fetch(buildUrl(urlQuery, next, parsedFilters)).then(r => r.json())
//       setMovies(prev => {
//         const ids = new Set(prev.map(m => m.id))
//         return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
//       })
//       setPage(next)
//       setTotalPages(data.totalPages ?? totalPages)
//     } catch {
//       // silent — user can scroll again
//     } finally {
//       setLoadingMore(false)
//     }
//   }, [loadingMore, page, totalPages, urlQuery, filtersKey])

//   // Load more (suggestions) 
//   const loadMoreSuggestions = useCallback(async () => {
//     if (loadingMoreSugg || suggPage >= suggTotalPages) return
//     const next = suggPage + 1
//     setLoadingMoreSugg(true)
//     try {
//       const data = await fetch(`${API}/movies/?page=${next}`).then(r => r.json())
//       setSuggestions(prev => {
//         const ids = new Set(prev.map(m => m.id))
//         return [...prev, ...(data.results ?? []).filter((m: MovieResult) => !ids.has(m.id))]
//       })
//       setSuggPage(next)
//       setSuggTotalPages(data.totalPages ?? suggTotalPages)
//     } finally {
//       setLoadingMoreSugg(false)
//     }
//   }, [loadingMoreSugg, suggPage, suggTotalPages])

//   return {
//     movies, loading, loadingMore, loadMore, hasMore,
//     suggestions, isEmpty, isFiltered,
//     loadMoreSuggestions, loadingMoreSugg,
//     suggHasMore: suggPage < suggTotalPages,
//     fetchError,
//   }
// }
