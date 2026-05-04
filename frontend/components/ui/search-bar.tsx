"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Clock, TrendingUp, Star, Film, Hash, Users } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { GENRES, TRENDING } from "@/constants/search-bar"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch, highlightMatch } from "@/lib/utils/search-bar"
import { MOCK_USERS } from "@/lib/mock-data"


type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * When true, renders an always-visible inline search input
   * (used inside the Library page instead of the nav dropdown).
   */
  inline?: boolean
  /** Called with the current query whenever it changes (inline mode). */
  onQueryChange?: (q: string) => void
}


export default function SearchBar({ open: externalOpen, onOpenChange, inline = false, onQueryChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = inline ? true : (externalOpen ?? internalOpen)

  const [query, setQuery] = useState("")
  const [movies, setMovies] = useState<MovieResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const debouncedQuery = useDebounce(query, 300)

  const isLibrary = pathname?.startsWith("/library")

  // Filter mock users by query
  const matchedUsers = useMemo(() => {
    const q = query || "popular"
    return MOCK_USERS.filter((u) =>
      u.username?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 3)
  }, [query])

  const topMovies = movies.slice(0, 4)
  const listMovies = movies.slice(0, 8)
  const isEmpty = query.length === 0

  // ── Fetch movies from real API ─────────────────────────────────────────────

  useEffect(() => {
    if (!debouncedQuery) return

    let ignore = false

    const run = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()

        if (!ignore) {
          setMovies((data.results ?? []).filter(r => r.type === "movie"))
        }
      } catch {
        if (!ignore) setMovies([])
      }
    }

    run()

    return () => {
      ignore = true
    }
  }, [debouncedQuery])
  // Bubble query up for inline (library) mode
  useEffect(() => {
    if (inline) onQueryChange?.(query)
  }, [query, inline, onQueryChange])

  // ── Open / close ──────────────────────────────────────────────────────────

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    setQuery("")
    setMovies([])
    setActiveIndex(-1)
    onOpenChange?.(false)
  }, [onOpenChange])

  // ── Side effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (open && !inline) inputRef.current?.focus()
  }, [open, inline])

  useEffect(() => {
    if (inline) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeSearch()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [closeSearch, inline])

  useEffect(() => {
    if (!open || inline) return
    const handler = () => closeSearch()
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [open, closeSearch, inline])

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const allNavigable = useMemo(
    () => [
      ...topMovies.map((m) => ({ type: "movie" as const, item: m })),
      ...matchedUsers.map((u) => ({ type: "user" as const, item: u })),
    ],
    [topMovies, matchedUsers]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === "Escape") {
        if (inline) setQuery("")
        else closeSearch()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((p) => Math.min(p + 1, allNavigable.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((p) => Math.max(p - 1, -1))
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        const nav = allNavigable[activeIndex]
        if (nav?.type === "movie") {
          saveRecentSearch(query)
          router.push(`/movie/${nav.item.id}`)
          if (!inline) closeSearch()
        } else if (nav?.type === "user") {
          router.push(`/user/${(nav.item as UserResult).id}`)
          if (!inline) closeSearch()
        }
      }
    },
    [open, activeIndex, allNavigable, query, router, closeSearch, inline]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSelectMovie = (movie: MovieResult) => {
    saveRecentSearch(query || movie.title)
    router.push(`/movie/${movie.id}`)
    if (!inline) closeSearch()
  }

  const handleSelectUser = (user: UserResult) => {
    router.push(`/user/${user.id}`)
    if (!inline) closeSearch()
  }

  const handleSelectGenre = (genre: string) => {
    saveRecentSearch(genre)
    router.push(`/browse?genre=${genre.toLowerCase()}`)
    if (!inline) closeSearch()
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

  // ── Dropdown panel content ─────────────────────────────────────────────────

  const dropdownContent = (
    <div className="z-40 w-full p-2!">
      {isEmpty ? (
        <>
          {recentSearches.length > 0 && (
            <div className="mb-4! border border-red-400">
              <SectionHeading icon={<Clock className="h-3 w-3" />} label="Recent" />
              <div className="flex flex-col gap-0.5">
                {recentSearches.map((term, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectRecent(term)}
                    className="flex items-center justify-between px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/10 group transition-colors"
                  >
                    <span className="text-sm text-white group-hover:text-white/90 transition-colors">{term}</span>
                    <button
                      onClick={(e) => handleRemoveRecent(e, term)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4! border border-blue-400">
            <SectionHeading icon={<TrendingUp className="h-3 w-3" />} label="Trending" />
            <div className="flex flex-col gap-0.5">
              {TRENDING.map((term, i) => (
                <div
                  key={i}
                  onClick={() => { setQuery(term); inputRef.current?.focus() }}
                  className="flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/10 group transition-colors"
                >
                  <span className="text-[11px] text-white/20 w-4 text-right font-mono">{i + 1}</span>
                  <span className="text-sm text-white group-hover:text-white/90 transition-colors">{term}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-green-400">
            <SectionHeading icon={<Hash className="h-3 w-3" />} label="Browse genres" />
            <div className="flex flex-wrap gap-1.5 px-2!">
              {GENRES.map((genre) => (
                <GenrePill key={genre} genre={genre} onClick={() => handleSelectGenre(genre)} />
              ))}
            </div>
          </div>
        </>
      ) : movies.length === 0 && matchedUsers.length === 0 && !loading ? (
        <div className="px-4! py-10! text-center border border-yellow-400 rounded-md">
          <p className="text-white/30 text-sm">
            No results for <span className="text-white/50">`{query}`</span>
          </p>
          <p className="text-white/20 text-xs mt-1">Try a different title or browse genres</p>
        </div>
      ) : (
        <>
          {topMovies.length > 0 && (
            <div className="mb-4! border border-yellow-400">
              <SectionHeading icon={<Film className="h-3 w-3" />} label="Top results" />
              <div className="flex gap-2 overflow-x-auto pb-1! border border-pink-400" style={{ scrollbarWidth: "none" }}>
                {topMovies.map((movie, i) => (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie)}
                    className={`shrink-0 w-28 cursor-pointer rounded-md overflow-hidden border transition-all duration-150 hover:scale-105 hover:border-white/30 ${
                      activeIndex === i ? "border-white/25 scale-105" : "border-white/8"
                    }`}
                  >
                    <div className="aspect-2/3 bg-white/5 relative">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
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
                              <Star className="h-2 w-2 fill-yellow-400/70" />
                              {movie.rating.toFixed(1)}
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

          {listMovies.length > 0 && (
            <div className="mb-4! border border-blue-400">
              <SectionHeading label="Movies" />
              <div className="flex flex-col gap-0.5">
                {listMovies.map((movie, i) => (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectMovie(movie)}
                    className={`flex items-center gap-3 px-2! py-1.5! rounded-md cursor-pointer transition-all duration-100 ${
                      activeIndex === topMovies.length + i ? "bg-white/10" : "hover:bg-white/6"
                    }`}
                  >
                    <div className="w-9 h-12 shrink-0 rounded-md bg-white/5 overflow-hidden relative">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
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
                            <Star className="h-2.5 w-2.5 fill-yellow-400/60" />
                            {movie.rating.toFixed(1)}
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

          {matchedUsers.length > 0 && (
            <div className="mb-4! border border-green-400">
              <SectionHeading label="Users" icon={<Users className="h-3 w-3" />} />
              <div className="flex flex-col gap-0.5">
                {matchedUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/6 transition-all"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-md overflow-hidden relative bg-white/10">
                      <Image src={user.avatar} alt={user.username} fill className="object-cover" />
                    </div>
                    <p className="text-sm text-white/80">
                      @{highlightMatch(user.username, query)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionHeading icon={<Hash className="h-3 w-3" />} label="Genres" />
            <div className="flex flex-wrap gap-1.5 px-2!">
              {GENRES.map((genre) => (
                <GenrePill key={genre} genre={genre} onClick={() => handleSelectGenre(genre)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // ── Inline mode (Library page) ────────────────────────────────────────────

  if (inline) {
    return (
      <div className="relative w-full" ref={containerRef}>
        <div className="flex items-center gap-2 rounded-[10px] px-3! py-2.5! border border-white/15 bg-white/6 backdrop-blur-md text-white focus-within:border-white/30 focus-within:bg-white/10 transition-all duration-200 border border-red-700">
          <Search className="h-4 w-4 text-white/35 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
            placeholder="Search movies, series..."
            className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
          />
          <div className="flex items-center gap-2">
            {loading && (
              <div className="w-3 h-3 border border-white/30 border-t-white/60 rounded-full animate-spin" />
            )}
            {query && (
              <button onClick={() => setQuery("")} className="text-white/40 hover:text-white transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Dropdown mode (Navbar) ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!open && (
        <button
          onClick={openSearch}
          aria-label="Open search"
          className="flex items-center gap-2 rounded-[8px] border h-8! px-2! backdrop-blur-2xl! backdrop-saturate-150! border-white/30 bg-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
        >
          <Search className="h-5 w-5" />
          <span className="hidden md:block text-xs text-white">Search</span>
          <kbd className="hidden md:flex items-center gap-0.5 text-[10px] text-white border border-white/15 rounded px-1 py-0.5 font-mono">
            /
          </kbd>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 40, opacity: 0 }}
            animate={{
              width: typeof window !== "undefined" && window.innerWidth < 768 ? 300 : 520,
              opacity: 1,
            }}
            exit={{ width: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="absolute right-0 z-50"
          >
            <div role="combobox" aria-expanded={open} aria-haspopup="listbox" className="relative">
              <div
                className="flex items-center gap-2 rounded-t-md px-3! py-2! border border-white/30 bg-white/10 backdrop-blur-2xl backdrop-saturate-150! text-white focus-within:border-white/35 transition-all duration-200"
                style={{
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.04)",
                }}
              >
                <Search className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  ref={inputRef}
                  role="searchbox"
                  aria-label="Search HyperTube"
                  aria-autocomplete="list"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
                  placeholder="Search movies, series, genres..."
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
                />
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="w-3 h-3 border border-white/30 border-t-white/60 rounded-full animate-spin" />
                  )}
                  {query && (
                    <button onClick={() => setQuery("")} className="text-white/40 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <kbd className="text-[10px] text-white/20 border border-white/30 rounded px-1 py-0.5 font-mono">
                    ESC
                  </kbd>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                role="listbox"
                aria-label="Search results"
                className="rounded-b-md border border-t-0 border-white/30 bg-white/10 backdrop-blur-2xl backdrop-saturate-150! overflow-hidden absolute right-0 left-0 mt-0!"
                style={{ maxHeight: "520px", overflowY: "auto" }}
              >
                {dropdownContent}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({
  icon,
  label,
}: {
  icon?: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-2!">
      {icon && <span className="text-white/30">{icon}</span>}
      <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function GenrePill({ genre, onClick }: { genre: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-white/50 border border-white/30 bg-white/5 hover:bg-white/10 hover:text-white/90 hover:border-white/30 px-2.5! py-1! rounded-full transition-all duration-150"
    >
      {genre}
    </button>
  )
}


