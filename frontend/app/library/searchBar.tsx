"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Clock, TrendingUp, Star, Film, Users, Hash } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { useRouter } from "next/navigation"
import Image from "next/image"

const RECENT_SEARCHES_KEY = "hypertube_recent_searches"
const MAX_RECENT = 5

const TRENDING = [
  "Oppenheimer", "Dune: Part Two", "Poor Things",
  "Past Lives", "The Zone of Interest", "Killers of the Flower Moon",
]

const GENRES = [
  "Action", "Drama", "Sci-Fi", "Horror",
  "Comedy", "Thriller", "Animation", "Romance",
]

type SearchResult = {
  type: "movie" | "person"
  id: number
  title: string
  year?: string
  rating?: number
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
}

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(255,255,255,0.2)", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]")
  } catch { return [] }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return
  const recent = getRecentSearches().filter(q => q !== query)
  const updated = [query, ...recent].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

function removeRecentSearch(query: string) {
  const updated = getRecentSearches().filter(q => q !== query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

export default function SearchBar({ open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  const movies = results.filter(r => r.type === "movie").slice(0, 8)
  const topResults = results.slice(0, 4)
  const isEmpty = query.length === 0

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    setQuery("")
    setResults([])
    setActiveIndex(-1)
    onOpenChange?.(false)
  }, [onOpenChange])

  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeSearch()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [closeSearch])

  useEffect(() => {
    if (!open) return
    const handler = () => closeSearch()
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [open, closeSearch])

  const allNavigable = useMemo(() => [
    ...topResults.map(r => ({ type: "result" as const, item: r })),
    ...GENRES.map(g => ({ type: "genre" as const, label: g })),
  ], [topResults])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === "Escape") { closeSearch(); return }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(p => Math.min(p + 1, allNavigable.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(p => Math.max(p - 1, -1))
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      const nav = allNavigable[activeIndex]
      if (nav?.type === "result") {
        saveRecentSearch(query)
        router.push(`/movie/${nav.item.id}`)
        closeSearch()
      }
    }
  }, [open, activeIndex, allNavigable, query, router, closeSearch])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const handleSelectMovie = (movie: SearchResult) => {
    saveRecentSearch(query || movie.title)
    router.push(`/movie/${movie.id}`)
    closeSearch()
  }

  const handleSelectGenre = (genre: string) => {
    saveRecentSearch(genre)
    router.push(`/browse?genre=${genre.toLowerCase()}`)
    closeSearch()
  }

  const handleSelectRecent = (term: string) => {
    setQuery(term)
    inputRef.current?.focus()
  }

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation()
    removeRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!open && (
        <button
          onClick={openSearch}
          aria-label="Open search"
          className="flex items-center gap-2 rounded-[8px] border h-8! px-2! backdrop-blur-2xl! border-white/20 bg-white/8 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/12 transition-all duration-200 hover:scale-105"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:block text-xs text-white/40">Search</span>
          <kbd className="hidden md:flex items-center gap-0.5 text-[10px] text-white/25 border border-white/15 rounded px-1 py-0.5 font-mono">
            /
          </kbd>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 40, opacity: 0 }}
            animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? 300 : 520, opacity: 1 }}
            exit={{ width: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="absolute right-0 z-50"
          >
            <div
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              className="relative"
            >
              <div className="flex items-center gap-2 rounded-t-[10px] px-3! py-2! border border-white/20 bg-black/60 backdrop-blur-xl text-white focus-within:border-white/35 focus-within:bg-black/70 transition-all duration-200"
                style={{ boxShadow: open ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.04)" : "none" }}
              >
                <Search className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  ref={inputRef}
                  role="searchbox"
                  aria-label="Search HyperTube"
                  aria-autocomplete="list"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
                  placeholder="Search movies, series, genres..."
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
                />
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                  )}
                  {query && (
                    <button onClick={() => setQuery("")} className="text-white/40 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <kbd className="text-[10px] text-white/20 border border-white/10 rounded px-1 py-0.5 font-mono">ESC</kbd>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                role="listbox"
                aria-label="Search results"
                className="rounded-b-[10px] border border-t-0 border-white/20 bg-black/75 backdrop-blur-xl overflow-hidden"
                style={{ maxHeight: "520px", overflowY: "auto" }}
              >
                {isEmpty ? (
                  <div className="p-3!">
                    {recentSearches.length > 0 && (
                      <div className="mb-4!">
                        <div className="flex items-center gap-2 px-2! mb-2!">
                          <Clock className="h-3 w-3 text-white/30" />
                          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Recent</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {recentSearches.map((term, i) => (
                            <div
                              key={i}
                              onClick={() => handleSelectRecent(term)}
                              className="flex items-center justify-between px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/8 group transition-colors"
                            >
                              <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">{term}</span>
                              <button
                                onClick={e => handleRemoveRecent(e, term)}
                                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 px-2! mb-2!">
                        <TrendingUp className="h-3 w-3 text-white/30" />
                        <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Trending</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {TRENDING.map((term, i) => (
                          <div
                            key={i}
                            onClick={() => { setQuery(term); inputRef.current?.focus() }}
                            className="flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/8 group transition-colors"
                          >
                            <span className="text-[11px] text-white/20 w-4 text-right font-mono">{i + 1}</span>
                            <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">{term}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4!">
                      <div className="flex items-center gap-2 px-2! mb-2!">
                        <Hash className="h-3 w-3 text-white/30" />
                        <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Browse genres</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-2!">
                        {GENRES.map(genre => (
                          <button
                            key={genre}
                            onClick={() => handleSelectGenre(genre)}
                            className="text-xs text-white/50 border border-white/10 bg-white/5 hover:bg-white/12 hover:text-white/90 hover:border-white/20 px-2.5! py-1! rounded-full transition-all duration-150"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : results.length === 0 && !loading ? (
                  <div className="px-4! py-10! text-center">
                    <p className="text-white/30 text-sm">No results for <span className="text-white/50">`{query}`</span></p>
                    <p className="text-white/20 text-xs mt-1">Try a different title or browse genres</p>
                  </div>
                ) : (
                  <div className="p-3!">
                    {topResults.length > 0 && (
                      <div className="mb-4!">
                        <div className="flex items-center gap-2 px-2! mb-2!">
                          <Film className="h-3 w-3 text-white/30" />
                          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Top results</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1!" style={{ scrollbarWidth: "none" }}>
                          {topResults.map((movie, i) => (
                            <div
                              key={movie.id}
                              onClick={() => handleSelectMovie(movie)}
                              className={`shrink-0 w-28 cursor-pointer rounded-[6px] overflow-hidden border transition-all duration-150 hover:scale-105 hover:border-white/20 ${activeIndex === i ? "border-white/25 scale-105" : "border-white/8"}`}
                            >
                              <div className="aspect-[2/3] bg-white/5 relative">
                                {movie.poster_path ? (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                    width={36}
                                    height={36}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Film className="h-6 w-6 text-white/20" />
                                  </div>
                                )}
                              </div>
                              <div className="p-1.5! bg-black/40">
                                <p className="text-white/80 text-[11px] font-medium truncate leading-tight">
                                  {highlightMatch(movie.title, query)}
                                </p>
                                {(movie.year || movie.rating) && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {movie.rating && (
                                      <span className="text-[10px] text-yellow-400/70 flex items-center gap-0.5">
                                        <Star className="h-2 w-2 fill-yellow-400/70" />{movie.rating.toFixed(1)}
                                      </span>
                                    )}
                                    {movie.year && <span className="text-[10px] text-white/30">{movie.year}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {movies.length > 0 && (
                      <div className="mb-4!">
                        <div className="flex items-center gap-2 px-2! mb-1.5!">
                          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Movies</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {movies.map((movie, i) => (
                            <div
                              key={movie.id}
                              onClick={() => handleSelectMovie(movie)}
                              className={`flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer transition-all duration-100 ${activeIndex === topResults.length + i ? "bg-white/10" : "hover:bg-white/6"}`}
                            >
                              <div className="w-9 h-12 shrink-0 rounded-[4px] bg-white/5 overflow-hidden">
                                {movie.poster_path ? (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                    width={36}
                                    height={48}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Film className="h-3 w-3 text-white/20" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white/80 truncate font-medium">
                                  {highlightMatch(movie.title, query)}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {movie.rating && (
                                    <span className="text-[11px] text-yellow-400/60 flex items-center gap-0.5">
                                      <Star className="h-2.5 w-2.5 fill-yellow-400/60" />{movie.rating.toFixed(1)}
                                    </span>
                                  )}
                                  {movie.year && <span className="text-[11px] text-white/30">{movie.year}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 px-2! mb-1.5!">
                        <Hash className="h-3 w-3 text-white/30" />
                        <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Genres</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-2!">
                        {GENRES.map(genre => (
                          <button
                            key={genre}
                            onClick={() => handleSelectGenre(genre)}
                            className="text-xs text-white/50 border border-white/10 bg-white/5 hover:bg-white/12 hover:text-white/90 hover:border-white/20 px-2.5! py-1! rounded-full transition-all duration-150"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}