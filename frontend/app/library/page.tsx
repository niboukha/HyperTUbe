"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, TrendingUp, Clock } from "lucide-react"
import { MovieResult } from "@/types/search"
import { GENRES } from "@/constants/search-bar"
import { useSearchParams } from "next/navigation"
import MovieCard from "@/components/library-components/movie-card"
import FilterPill from "@/components/library-components/filter-pill"
import { FilterDropdown, YearInput } from "@/components/library-components/utils"


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

export default function LibraryPage() {
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get("q") ?? ""

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

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      try {
        const q = urlQuery || "popular"
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        let results: MovieResult[] = (data.results ?? []).filter((r: MovieResult) => r.type === "movie")

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
  }, [urlQuery, filters])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) {
        setActiveFilterPanel(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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

  return (
    <div className="min-h-screen flex flex-col gap-4 pb-6! overflow-x-hidden pt-18! px-5! md:px-13! lg:px-16!">

      <div ref={filterRef}>
        <div className="flex items-center justify-between gap-3!">
          {/* LEFT — Sort pill */}
          <div className="shrink-0">
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
          </div>

          {/* CENTER — Genre */}
          <div className="flex-1 flex justify-center">
            <div className="flex flex-wrap items-center gap-2 max-w-2xl justify-center">
              {GENRES.map((genre) => {
                const selected = filters.genres.includes(genre)

                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`
                      text-xs px-3! py-1.5! rounded-full border transition-all duration-200
                      whitespace-nowrap
                      ${
                        selected
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                      }
                    `}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT — Rating, Year, Clear */}
          <div className="shrink-0 flex items-center gap-2">

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

      </div>

      <div className=" flex items-center justify-between">
        <p className="text-md text-white/30">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
              Searching…
            </span>
          ) : (
            <>
              <span className="text-accent-red font-title pr-2!">|</span>
              <span className="text-white font-title tracking-wide uppercase">
                {urlQuery ? urlQuery : "trending"}
              </span>{" "}
              results
            </>
          )}
        </p>
      </div>

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

      {!loading && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24! text-center">
          <p className="text-white/20 text-4xl mb-3!">🎬</p>
          <p className="text-white/30 text-base">No movies found</p>
          <p className="text-white/20 text-sm mt-1!">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

