"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlidersHorizontal, ChevronDown, X, Star, TrendingUp, Clock } from "lucide-react"
import { MovieResult } from "@/types/search"
import Image from "next/image"
import SearchBar from "@/components/ui/search-bar"
import { GENRES } from "@/constants/search-bar"

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = "popular" | "rating" | "newest" | "oldest"
type Filters = {
  genres: string[]
  sort: SortOption
  minRating: number
  yearRange: [number, number]
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "popular", label: "Most Popular", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: "rating", label: "Top Rated", icon: <Star className="h-3.5 w-3.5" /> },
  { value: "newest", label: "Newest First", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "oldest", label: "Oldest First", icon: <Clock className="h-3.5 w-3.5 rotate-180" /> },
]

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1960

// ─── Component ────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<Filters>({
    genres: [],
    sort: "popular",
    minRating: 0,
    yearRange: [MIN_YEAR, CURRENT_YEAR],
  })
  const [movies, setMovies] = useState<MovieResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilterPanel, setActiveFilterPanel] = useState<"sort" | "genre" | "rating" | "year" | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  const activeFilterCount =
    filters.genres.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR ? 1 : 0)

  // ── Fetch movies ───────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      try {
        const q = query || "popular"
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        let results: MovieResult[] = (data.results ?? []).filter((r: MovieResult) => r.type === "movie")

        // Client-side filter by genre (TMDB doesn't return genre strings directly in search,
        // so this would need genre IDs in a real setup — kept as a passthrough for now)
        if (filters.minRating > 0) {
          results = results.filter((m) => (m.rating ?? 0) >= filters.minRating)
        }
        if (filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR) {
          results = results.filter((m) => {
            const y = Number(m.year ?? 0)
            return y >= filters.yearRange[0] && y <= filters.yearRange[1]
          })
        }

        // Sort
        if (filters.sort === "rating") {
          results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        } else if (filters.sort === "newest") {
          results.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0))
        } else if (filters.sort === "oldest") {
          results.sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0))
        }

        setMovies(results)
      } catch {
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    const timeout = setTimeout(fetchMovies, 300)
    return () => clearTimeout(timeout)
  }, [query, filters])

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) {
        setActiveFilterPanel(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const toggleGenre = (genre: string) => {
    setFilters((f) => ({
      ...f,
      genres: f.genres.includes(genre) ? f.genres.filter((g) => g !== genre) : [...f.genres, genre],
    }))
  }

  const clearFilters = () => {
    setFilters({ genres: [], sort: "popular", minRating: 0, yearRange: [MIN_YEAR, CURRENT_YEAR] })
  }

  const selectedSort = SORT_OPTIONS.find((s) => s.value === filters.sort)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4! py-8! md:px-8!">

        {/* Page header */}
        <div className="mb-8!">
          <h1 className="text-3xl font-bold text-white/90 mb-1!">Library</h1>
          <p className="text-white/35 text-sm">Discover movies from every era and genre</p>
        </div>

        {/* ── Search + Filter Bar ─────────────────────────────────────────── */}
        <div className="mb-6!" ref={filterRef}>
          <div className="flex flex-col md:flex-row gap-3!">

            {/* Inline search (no dropdown on library page) */}
            <div className="flex-1">
              <SearchBar inline onQueryChange={setQuery} />
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Sort pill */}
              <FilterPill
                active={activeFilterPanel === "sort"}
                onClick={() => setActiveFilterPanel((p) => (p === "sort" ? null : "sort"))}
                icon={selectedSort?.icon}
                label={selectedSort?.label ?? "Sort"}
              >
                <AnimatePresence>
                  {activeFilterPanel === "sort" && (
                    <FilterDropdown>
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilters((f) => ({ ...f, sort: opt.value }))
                            setActiveFilterPanel(null)
                          }}
                          className={`flex items-center gap-2.5 w-full px-3! py-2! rounded-[6px] text-sm text-left transition-colors ${
                            filters.sort === opt.value
                              ? "bg-white/12 text-white"
                              : "text-white/55 hover:bg-white/8 hover:text-white/90"
                          }`}
                        >
                          <span className="text-white/40">{opt.icon}</span>
                          {opt.label}
                          {filters.sort === opt.value && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                          )}
                        </button>
                      ))}
                    </FilterDropdown>
                  )}
                </AnimatePresence>
              </FilterPill>

              {/* Genre pill */}
              <FilterPill
                active={activeFilterPanel === "genre"}
                onClick={() => setActiveFilterPanel((p) => (p === "genre" ? null : "genre"))}
                label="Genre"
                badge={filters.genres.length || undefined}
              >
                <AnimatePresence>
                  {activeFilterPanel === "genre" && (
                    <FilterDropdown width={280}>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider px-1! mb-2!">Select genres</p>
                      <div className="flex flex-wrap gap-1.5!">
                        {GENRES.map((genre) => {
                          const selected = filters.genres.includes(genre)
                          return (
                            <button
                              key={genre}
                              onClick={() => toggleGenre(genre)}
                              className={`text-xs px-2.5! py-1! rounded-full border transition-all duration-150 ${
                                selected
                                  ? "bg-white/15 border-white/25 text-white/90"
                                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                              }`}
                            >
                              {genre}
                            </button>
                          )
                        })}
                      </div>
                      {filters.genres.length > 0 && (
                        <button
                          onClick={() => setFilters((f) => ({ ...f, genres: [] }))}
                          className="mt-3! w-full text-xs text-white/30 hover:text-white/60 transition-colors text-center"
                        >
                          Clear genres
                        </button>
                      )}
                    </FilterDropdown>
                  )}
                </AnimatePresence>
              </FilterPill>

              {/* Rating pill */}
              <FilterPill
                active={activeFilterPanel === "rating"}
                onClick={() => setActiveFilterPanel((p) => (p === "rating" ? null : "rating"))}
                label="Rating"
                badge={filters.minRating > 0 ? `${filters.minRating}+` : undefined}
                icon={<Star className="h-3 w-3" />}
              >
                <AnimatePresence>
                  {activeFilterPanel === "rating" && (
                    <FilterDropdown>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider px-1! mb-3!">
                        Minimum rating
                      </p>
                      <div className="flex flex-col gap-1!">
                        {[0, 5, 6, 7, 7.5, 8, 9].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setFilters((f) => ({ ...f, minRating: r }))
                              setActiveFilterPanel(null)
                            }}
                            className={`flex items-center gap-2 px-3! py-1.5! rounded-[6px] text-sm transition-colors ${
                              filters.minRating === r
                                ? "bg-white/12 text-white"
                                : "text-white/55 hover:bg-white/8 hover:text-white/90"
                            }`}
                          >
                            <Star className={`h-3 w-3 ${r > 0 ? "text-yellow-400/70 fill-yellow-400/70" : "text-white/20"}`} />
                            {r === 0 ? "Any rating" : `${r}+ stars`}
                            {filters.minRating === r && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                          </button>
                        ))}
                      </div>
                    </FilterDropdown>
                  )}
                </AnimatePresence>
              </FilterPill>

              {/* Year pill */}
              <FilterPill
                active={activeFilterPanel === "year"}
                onClick={() => setActiveFilterPanel((p) => (p === "year" ? null : "year"))}
                label="Year"
                badge={
                  filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR
                    ? `${filters.yearRange[0]}–${filters.yearRange[1]}`
                    : undefined
                }
              >
                <AnimatePresence>
                  {activeFilterPanel === "year" && (
                    <FilterDropdown>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider px-1! mb-3!">Year range</p>
                      <div className="flex flex-col gap-2!">
                        <YearInput
                          label="From"
                          value={filters.yearRange[0]}
                          min={MIN_YEAR}
                          max={filters.yearRange[1]}
                          onChange={(v) => setFilters((f) => ({ ...f, yearRange: [v, f.yearRange[1]] }))}
                        />
                        <YearInput
                          label="To"
                          value={filters.yearRange[1]}
                          min={filters.yearRange[0]}
                          max={CURRENT_YEAR}
                          onChange={(v) => setFilters((f) => ({ ...f, yearRange: [f.yearRange[0], v] }))}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setFilters((f) => ({ ...f, yearRange: [MIN_YEAR, CURRENT_YEAR] }))
                          setActiveFilterPanel(null)
                        }}
                        className="mt-3! w-full text-xs text-white/30 hover:text-white/60 transition-colors text-center"
                      >
                        Reset range
                      </button>
                    </FilterDropdown>
                  )}
                </AnimatePresence>
              </FilterPill>

              {/* Clear all */}
              <AnimatePresence>
                {activeFilterCount > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-full px-2.5! py-1.5! transition-all hover:border-white/20"
                  >
                    <X className="h-3 w-3" />
                    Clear ({activeFilterCount})
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active genre tags */}
          <AnimatePresence>
            {filters.genres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 mt-3! overflow-hidden"
              >
                {filters.genres.map((genre) => (
                  <motion.button
                    key={genre}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    onClick={() => toggleGenre(genre)}
                    className="flex items-center gap-1.5 text-xs text-white/70 border border-white/20 bg-white/8 rounded-full px-2.5! py-1! hover:bg-white/12 transition-all"
                  >
                    {genre}
                    <X className="h-2.5 w-2.5 text-white/40" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results count */}
        <div className="mb-4! flex items-center justify-between">
          <p className="text-sm text-white/30">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
                Searching…
              </span>
            ) : (
              <>
                <span className="text-white/60 font-medium">{movies.length}</span> results
                {query && (
                  <>
                    {" "}for <span className="text-white/60">"{query}"</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* ── Movie Grid ─────────────────────────────────────────────────── */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3!"
        >
          <AnimatePresence mode="popLayout">
            {movies.map((movie, i) => (
              <motion.div
                key={movie.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
              >
                <MovieCard movie={movie} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {!loading && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24! text-center">
            <p className="text-white/20 text-4xl mb-3!">🎬</p>
            <p className="text-white/30 text-base">No movies found</p>
            <p className="text-white/20 text-sm mt-1!">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MovieCard ────────────────────────────────────────────────────────────────

function MovieCard({ movie }: { movie: MovieResult }) {
  return (
    <a
      href={`/movie/${movie.id}`}
      className="group block rounded-[8px] overflow-hidden border border-white/6 bg-white/3 hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="aspect-[2/3] bg-white/5 relative overflow-hidden">
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/15 text-4xl">🎬</span>
          </div>
        )}
        {movie.rating && (
          <div className="absolute top-1.5! right-1.5! flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5! py-0.5! text-[10px] text-yellow-400/90">
            <Star className="h-2.5 w-2.5 fill-yellow-400/90" />
            {movie.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-2!">
        <p className="text-white/80 text-xs font-medium truncate leading-tight">{movie.title}</p>
        {movie.year && <p className="text-white/30 text-[10px] mt-0.5!">{movie.year}</p>}
      </div>
    </a>
  )
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  badge,
  icon,
  onClick,
  children,
}: {
  label: string
  active: boolean
  badge?: string | number
  icon?: React.ReactNode
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 text-xs rounded-full border px-3! py-1.5! transition-all duration-150 ${
          active || badge
            ? "bg-white/12 border-white/25 text-white/90"
            : "border-white/12 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
        }`}
      >
        {icon && <span className={active || badge ? "text-white/60" : "text-white/30"}>{icon}</span>}
        {label}
        {badge !== undefined ? (
          <span className="ml-0.5 bg-white/20 text-white/90 rounded-full px-1.5! py-0.5! text-[10px] leading-none">
            {badge}
          </span>
        ) : (
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${active ? "rotate-180" : ""} ${
              active ? "text-white/60" : "text-white/25"
            }`}
          />
        )}
      </button>
      {children}
    </div>
  )
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({ children, width = 200 }: { children: React.ReactNode; width?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      style={{ width }}
      className="absolute top-full left-0 mt-2! z-50 rounded-[10px] border border-white/15 bg-black/80 backdrop-blur-xl p-3! shadow-2xl"
    >
      {children}
    </motion.div>
  )
}

// ─── YearInput ────────────────────────────────────────────────────────────────

function YearInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 justify-between">
      <span className="text-xs text-white/40 w-8">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v >= min && v <= max) onChange(v)
        }}
        className="flex-1 bg-white/8 border border-white/10 rounded-[6px] px-2! py-1! text-sm text-white/80 outline-none focus:border-white/25 transition-colors text-center"
      />
    </div>
  )
}