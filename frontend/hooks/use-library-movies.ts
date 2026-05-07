"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
import { MovieResult } from "@/types/search"

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
    p.set("genre", filters.genres.join(","))
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

  //  Suggestions when main results empty 
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

  //  Main fetch — resets when query or filters change ─
  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const run = async () => {
      setLoading(true)
      setMovies([])
      setPage(1)
      try {
        // console.log("Fetching movies with URL:", buildUrl(urlQuery, 1, filters))
        const data = await fetch(buildUrl(urlQuery, 1, filters), {
          signal: ctrl.signal,
        }).then((r) => r.json())
        
        // console.log("Received data:", JSON.stringify(data, null, 2))
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

  //  Load more 
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



// "use client"

// import { useState, useEffect, useRef, useCallback } from "react"
// import { MovieResult } from "@/types/movies"
// import { Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"

// // ─ Sort map 
// const SORT_MAP: Record<string, string> = {
//   popular: "popularity",
//   rating:  "vote_average",
//   newest:  "primary_release_date",
//   oldest:  "primary_release_date",
// }

// // ─ Build the API URL with ALL active filters 
// function buildUrl(q: string, page: number, filters: Filters): string {
//   const p = new URLSearchParams()
//   p.set("page", String(page))

//   if (q) p.set("q", q)

//   if (filters.genres.length > 0) p.set("genre", filters.genres[0])
//   if (filters.minRating > 0)     p.set("minRating", String(filters.minRating))

//   if (filters.yearRange[0] !== MIN_YEAR)     p.set("yearFrom", String(filters.yearRange[0]))
//   if (filters.yearRange[1] !== CURRENT_YEAR) p.set("yearTo",   String(filters.yearRange[1]))

//   if (filters.sort && SORT_MAP[filters.sort]) p.set("sort", SORT_MAP[filters.sort])

//   return `/api/movies?${p}`
// }

// // ─ Determine whether any filter / query is active 
// function isActive(q: string, filters: Filters): boolean {
//   return (
//     q.trim().length > 0      ||
//     filters.genres.length > 0 ||
//     filters.minRating > 0     ||
//     filters.yearRange[0] !== MIN_YEAR ||
//     filters.yearRange[1] !== CURRENT_YEAR ||
//     filters.sort !== "popular"
//   )
// }

// export interface LibraryMoviesState {
//   movies:      MovieResult[]
//   loading:     boolean
//   loadingMore: boolean
//   loadMore:    () => void
//   hasMore:     boolean
//   page:        number
//   totalPages:  number
//   /** true only when a query/filter is active AND the server returned 0 results */
//   noResults:   boolean
// }

// export function useLibraryMovies(urlQuery: string, filters: Filters): LibraryMoviesState {
//   const [movies,      setMovies]      = useState<MovieResult[]>([])
//   const [page,        setPage]        = useState(1)
//   const [totalPages,  setTotalPages]  = useState(1)
//   const [loading,     setLoading]     = useState(true)
//   const [loadingMore, setLoadingMore] = useState(false)
//   const [noResults,   setNoResults]   = useState(false)

//   const abortRef = useRef<AbortController | null>(null)

//   const hasMore = page < totalPages

//   //  Initial / reset fetch whenever query or filters change ─
//   useEffect(() => {
//     abortRef.current?.abort()
//     const ctrl = new AbortController()
//     abortRef.current = ctrl

//     const run = async () => {
//       setLoading(true)
//       setMovies([])
//       setPage(1)
//       setNoResults(false)

//       try {
//         const data = await fetch(buildUrl(urlQuery, 1, filters), {
//           signal: ctrl.signal,
//         }).then((r) => r.json())

//         const results: MovieResult[] = (data.results ?? []).filter(
//           (r: MovieResult) => r.type === "movie",
//         )

//         setMovies(results)
//         setTotalPages(data.totalPages ?? 1)

//         // Only flag noResults when the user actually searched / filtered
//         if (results.length === 0 && isActive(urlQuery, filters)) {
//           setNoResults(true)
//         }
//       } catch (err) {
//         if ((err as Error).name !== "AbortError") {
//           setMovies([])
//           if (isActive(urlQuery, filters)) setNoResults(true)
//         }
//       } finally {
//         if (!ctrl.signal.aborted) setLoading(false)
//       }
//     }

//     // Tiny debounce only for text search to avoid hammering on each keystroke
//     const delay = urlQuery ? 300 : 0
//     const t = setTimeout(run, delay)
//     return () => {
//       clearTimeout(t)
//       ctrl.abort()
//     }
//   }, [urlQuery, filters])

//   //  Load next page ─
//   const loadMore = useCallback(async () => {
//     if (loadingMore || page >= totalPages) return
//     const next = page + 1
//     setLoadingMore(true)

//     try {
//       const data = await fetch(buildUrl(urlQuery, next, filters)).then((r) => r.json())
//       setMovies((prev) => {
//         const seen = new Set(prev.map((m) => m.id))
//         const fresh = (data.results ?? []).filter(
//           (m: MovieResult) => m.type === "movie" && !seen.has(m.id),
//         )
//         return [...prev, ...fresh]
//       })
//       setPage(next)
//       setTotalPages(data.totalPages ?? totalPages)
//     } catch {
//       // silently ignore — user can scroll again to retry
//     } finally {
//       setLoadingMore(false)
//     }
//   }, [loadingMore, page, totalPages, urlQuery, filters])

//   return {
//     movies,
//     loading,
//     loadingMore,
//     loadMore,
//     hasMore,
//     page,
//     totalPages,
//     noResults,
//   }
// }