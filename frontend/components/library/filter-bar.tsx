"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, TrendingUp, Clock, Check, ArrowUpAZ, Filter, ChevronLeft } from "lucide-react"
import { GENRES } from "@/constants/search-bar"
import FilterPill from "./filter-pill"
import { FilterDropdown, YearInput } from "./utils"
import { useIsMobile } from "@/hooks/use-filter-mobile"

export type SortOption = "popular" | "rating" | "newest" | "oldest" | "name"
export type Filters = {
  genres: string[]
  sort: SortOption
  minRating: number
  yearRange: [number, number]
}

export const CURRENT_YEAR = new Date().getFullYear()
export const MIN_YEAR     = 1960

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "name",    label: "Name", icon: <ArrowUpAZ className="h-3.5 w-3.5" /> },
  { value: "popular", label: "Most Popular", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: "rating",  label: "Top Rated",    icon: <Star className="h-3.5 w-3.5" /> },
  { value: "newest",  label: "Newest First", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "oldest",  label: "Oldest First", icon: <Clock className="h-3.5 w-3.5 rotate-180" /> },
]

type Props = {
  filters: Filters
  onChange: (f: Filters) => void
}

export function FilterBar({ filters, onChange }: Props) {
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activePanel, setActivePanel, containerRef] = useActivePanel()
  const [draftYear, setDraftYear] = useState<[number, number]>(filters.yearRange)

  const activeFilterCount =
    filters.genres.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR ? 1 : 0)

  const toggleGenre = (genre: string) =>
    onChange({ ...filters, genres: filters.genres.includes(genre) ? filters.genres.filter((g) => g !== genre) : [...filters.genres, genre] })

  const clearFilters = () =>
    onChange({ genres: [], sort: "popular", minRating: 0, yearRange: [MIN_YEAR, CURRENT_YEAR] })

  const selectedSort = SORT_OPTIONS.find((s) => s.value === filters.sort)
  const commitYearRange = (yearRange: [number, number]) => {
    setDraftYear(yearRange)
    onChange({ ...filters, yearRange })
    setActivePanel(null)
  }

  const prevPanel = useRef<Panel>(null)
    useEffect(() => {
      if (prevPanel.current === "year" && activePanel !== "year") {
        onChange({ ...filters, yearRange: draftYear })
      }
      prevPanel.current = activePanel
  }, [activePanel])

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (!isMobile) return
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"   // also blocks pull-to-refresh
    } else {
      document.body.style.overflow = ""
      document.body.style.touchAction = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.body.style.touchAction = ""
    }
  }, [mobileOpen, isMobile])

  // Mobile version
  if (isMobile) {
    return (
      <div ref={containerRef}>
        {/* Mobile header with filter button */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 px-2! py-1! rounded-full transition-all border-white/12 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20 border"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-regular">filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-white/20 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={clearFilters}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Clear
            </motion.button>
          )}
        </div>

        {/* Mobile filter sheet */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-background backdrop-blur-sm z-40 touch-none"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{ overscrollBehavior: "contain" }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/10 rounded-t-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="sticky bg-black/95 top-0 border-b border-white/10 px-4! py-4! flex items-center justify-between">
                  <h2 className="text-white font-semibold">Filters</h2>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5! rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 text-white/70" />
                  </button>
                </div>

                {/* Filters content */}
                <div className="px-4! py-4! space-y-6!">
                  {/* Sort */}
                  <div>
                    <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3!">Sort by</h3>
                    <div className="space-y-2!">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            onChange({ ...filters, sort: opt.value })
                            setMobileOpen(false)
                          }}
                          className={`flex items-center gap-3! w-full px-3! py-3! rounded-md text-sm transition-colors ${
                            filters.sort === opt.value
                              ? "bg-white/12 text-white"
                              : "text-white/55 hover:bg-white/5 hover:text-white/90"
                          }`}
                        >
                          <span className={filters.sort === opt.value ? "text-white/80" : "text-white/30"}>{opt.icon}</span>
                          {opt.label}
                          {filters.sort === opt.value && (
                            <Check className="ml-auto! h-4 w-4 text-white/60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Genres */}
                  <div>
                    <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3!">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((genre) => {
                        const selected = filters.genres.includes(genre)
                        return (
                          <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`px-2! py-1! rounded-full border text-xs transition-all ${
                              selected
                                ? "bg-white/20 border-white/30 text-white"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {genre}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3!">Minimum rating</h3>
                    <div className="space-y-2!">
                      {[0, 5, 6, 7, 7.5, 8, 9].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            onChange({ ...filters, minRating: r })
                            setMobileOpen(false)
                          }}
                          className={`flex items-center gap-3! w-full px-3! py-3! rounded-lg text-sm transition-colors ${
                            filters.minRating === r
                              ? "bg-white/12 text-white"
                              : "text-white/55 hover:bg-white/5 hover:text-white/90"
                          }`}
                        >
                          <Star className={`h-4 w-4 ${r > 0 ? "text-yellow-400/70 fill-yellow-400/70" : "text-white/20"}`} />
                          {r === 0 ? "Any rating" : `${r}+ stars`}
                          {filters.minRating === r && (
                            <Check className="ml-auto! h-4 w-4 text-white/60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Year Range */}
                  <div>
                    <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3!">Year range</h3>
                    <div className="space-y-3!">
                      <YearInput
                        label="From"
                        value={draftYear[0]}
                        min={MIN_YEAR}
                        max={draftYear[1]}
                        onChange={(v) => setDraftYear([v, draftYear[1]])}
                        onCommit={(v) => commitYearRange([v, draftYear[1]])}
                      />
                      <YearInput
                        label="To"
                        value={draftYear[1]}
                        min={draftYear[0]}
                        max={CURRENT_YEAR}
                        onChange={(v) => setDraftYear([draftYear[0], v])}
                        onCommit={(v) => commitYearRange([draftYear[0], v])}
                      />
                      <button
                        onClick={() => {
                          setDraftYear([MIN_YEAR, CURRENT_YEAR])
                          onChange({ ...filters, yearRange: [MIN_YEAR, CURRENT_YEAR] })
                        }}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors text-left pt-2!"
                      >
                        Reset range
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer - Apply button */}
                <div className="sticky bottom-0 bg-black/95 border-t border-white/10 px-4! py-4!">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="w-full px-4! py-3! rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                  >
                    Show results
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Desktop version
  return (
    <div ref={containerRef}>  
      <div className="flex items-center justify-between gap-3!">

        {/* Sort */}
        <div className="shrink-0">
          <FilterPill active={activePanel === "sort"} onClick={() => setActivePanel((p) => (p === "sort" ? null : "sort"))} icon={selectedSort?.icon} label={selectedSort?.label ?? "Sort"}>
            <AnimatePresence>
              {activePanel === "sort" && (
                <FilterDropdown isSorte = {true}>
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => { onChange({ ...filters, sort: opt.value }); setActivePanel(null) }}
                      className={`flex items-center gap-2.5! w-full px-3! py-2! rounded-[6px] text-sm text-left transition-colors ${filters.sort === opt.value ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/8 hover:text-white/90"}`}>
                      <span className="text-white/40">{opt.icon}</span>
                      {opt.label}
                      {filters.sort === opt.value && <Check className="ml-auto h-3 w-3 text-white/60" />}
                    </button>
                  ))}
                </FilterDropdown>
              )}
            </AnimatePresence>
          </FilterPill>
        </div>

        {/* Genres */}
        <div className="relative w-full h-[30px]">
            <div className="pointer-events-none absolute left-0! top-0! z-10! h-full w-8! bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8! bg-gradient-to-l from-black to-transparent" />
            <div
              className="
                flex items-center justify-center gap-1
                overflow-x-auto scrollbar-hide
                scroll-smooth
              "
            >
              {GENRES.map((genre) => {
                const selected = filters.genres.includes(genre)

                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`
                      shrink-0
                      text-[8px] md:text-xs
                      px-1! py-1!
                      rounded-full
                      border
                      transition-all duration-200
                      whitespace-nowrap
                      backdrop-blur-sm
                      ${
                        selected
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>

        {/* Rating, Year, Clear */}
        <div className="shrink-0 flex items-center gap-2">
          <FilterPill active={activePanel === "rating"} onClick={() => setActivePanel((p) => (p === "rating" ? null : "rating"))} label="Rating" badge={filters.minRating > 0 ? `${filters.minRating}+` : undefined} icon={<Star className="h-3 w-3" />}>
            <AnimatePresence>
              {activePanel === "rating" && (
                <FilterDropdown>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider px-1! mb-3!">Minimum rating</p>
                  {[0, 5, 6, 7, 7.5, 8, 9].map((r) => (
                    <button key={r} onClick={() => { onChange({ ...filters, minRating: r }); setActivePanel(null) }}
                      className={`flex items-center gap-2 w-full px-3! py-1.5! rounded-[6px] text-sm transition-colors ${filters.minRating === r ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/8 hover:text-white/90"}`}>
                      <Star className={`h-3 w-3 ${r > 0 ? "text-yellow-400/70 fill-yellow-400/70" : "text-white/20"}`} />
                      {r === 0 ? "Any rating" : `${r}+ stars`}
                      {filters.minRating === r && <Check className="ml-auto h-3 w-3 text-white/60" />}
                    </button>
                  ))}
                </FilterDropdown>
              )}
            </AnimatePresence>
          </FilterPill>

      <FilterPill
        active={activePanel === "year"}
        onClick={() => {
          if (activePanel !== "year") setDraftYear(filters.yearRange)
          setActivePanel((p) => (p === "year" ? null : "year"))
        }}
        label="Year"
        badge={
          filters.yearRange[0] !== MIN_YEAR || filters.yearRange[1] !== CURRENT_YEAR
            ? `${filters.yearRange[0]}–${filters.yearRange[1]}`
            : undefined
        }
      >
        <AnimatePresence>
          {activePanel === "year" && (
            <FilterDropdown>
              <p className="text-[11px] text-white/30 uppercase tracking-wider px-1! mb-3!">
                Year range
              </p>
              <div className="flex flex-col gap-2!">
                <YearInput
                  label="From"
                  value={draftYear[0]}
                  min={MIN_YEAR}
                  max={draftYear[1]}
                  onChange={(v) => setDraftYear([v, draftYear[1]])}
                  onCommit={(v) => commitYearRange([v, draftYear[1]])}
                />
                <YearInput
                  label="To"
                  value={draftYear[1]}
                  min={draftYear[0]}
                  max={CURRENT_YEAR}
                  onChange={(v) => setDraftYear([draftYear[0], v])}
                  onCommit={(v) => commitYearRange([draftYear[0], v])}
                />
              </div>
              <button
                onClick={() => {
                  setDraftYear([MIN_YEAR, CURRENT_YEAR])
                  onChange({ ...filters, yearRange: [MIN_YEAR, CURRENT_YEAR] })
                  setActivePanel(null)
                }}
                className="mt-3! w-full text-xs text-white/30 hover:text-white/60 transition-colors text-center"
              >
                Reset range
              </button>
            </FilterDropdown>
          )}
        </AnimatePresence>
      </FilterPill>



          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-full px-2.5! py-1.5! transition-all hover:border-white/20">
                <X className="h-3 w-3" /> Clear ({activeFilterCount})
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Encapsulate panel state + outside click in one place
type Panel = "sort" | "genre" | "rating" | "year" | null

function useActivePanel(): [
  Panel,
  React.Dispatch<React.SetStateAction<Panel>>,
  React.RefObject<HTMLDivElement | null>
] {
  const [panel, setPanel] = useState<Panel>(null)
  const containerRef      = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPanel(null)
      }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return [panel, setPanel, containerRef]
}