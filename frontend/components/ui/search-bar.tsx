"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { useRouter, usePathname } from "next/navigation"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch } from "@/lib/utils/search-bar"
import { SearchInput } from "./search-input"
import { SearchPanel } from "./search-panel"
import { MOCK_USERS } from "@/lib/mock-data"

const API = "http://localhost:8000"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  inline?: boolean
  onQueryChange?: (q: string) => void
  isLibraryMode?: boolean
}

export default function SearchBar({
  open: externalOpen,
  onOpenChange,
  inline = false,
  onQueryChange,
  isLibraryMode = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = inline ? true : (externalOpen ?? internalOpen)

  const [query,         setQuery]         = useState("")
  const [movies,        setMovies]         = useState<MovieResult[]>([])
  const [loading,       setLoading]       = useState(false)
  const [activeIndex,   setActiveIndex]   = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [mounted,       setMounted]       = useState(false)

  const inputRef      = useRef<HTMLInputElement>(null)
  const triggerRef    = useRef<HTMLButtonElement>(null)
  const panelRef      = useRef<HTMLDivElement>(null)
  const router        = useRouter()
  const pathname      = usePathname()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => { setMounted(true) }, [])

  // Close when route changes
  useEffect(() => { closeSearch() }, [pathname]) // eslint-disable-line

  const matchedUsers = useMemo(() =>
    !query ? [] : MOCK_USERS.filter(u =>
      u.username?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3),
  [query])

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    onOpenChange?.(false)
    setActiveIndex(-1)

    // delay reset so the selected item's route push fires first
    setTimeout(() => { setQuery(""); setMovies([]) }, 200)
  }, [onOpenChange])

  useEffect(() => {
    if (!debouncedQuery) { setMovies([]); return }

    let ignore = false
    const run = async () => {
      try {
        setLoading(true)
        const res  = await fetch(`${API}/search/?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (!ignore)
          setMovies((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [debouncedQuery])

  useEffect(() => { if (inline) onQueryChange?.(query) }, [query, inline, onQueryChange])

  // Outside click — check both trigger and panel
  useEffect(() => {
    if (inline || isLibraryMode) return
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = triggerRef.current?.contains(target)
      const insidePanel   = panelRef.current?.contains(target)
      if (!insideTrigger && !insidePanel) closeSearch()
    }
    // use capture phase so scroll events inside panel don't bubble wrong
    document.addEventListener("mousedown", h, true)
    return () => document.removeEventListener("mousedown", h, true)
  }, [closeSearch, inline, isLibraryMode])

  // Lock body scroll when open 
  useEffect(() => {
    if (!open || inline) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open, inline])

  // Keyboard
  const allNavigable = useMemo(() => [
    ...movies.slice(0, 4).map(m => ({ type: "movie" as const, item: m })),
    ...matchedUsers.map(u => ({ type: "user" as const, item: u as UserResult })),
  ], [movies, matchedUsers])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && !open && !inline && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        openSearch()
        return
      }
      if (!open) return
      if (e.key === "Escape") {
        inline ? setQuery("") : closeSearch()
        return
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, allNavigable.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, -1)) }
      if (e.key === "Enter" && activeIndex >= 0) {
        const nav = allNavigable[activeIndex]
        if (nav?.type === "movie") {
          saveRecentSearch(query)
          router.push(`/movies/${nav.item.id}`)
          if (!inline) closeSearch()
        }
        if (nav?.type === "user") {
          router.push(`/user/${(nav.item as UserResult).id}`)
          if (!inline) closeSearch()
        }
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, activeIndex, allNavigable, query, router, closeSearch, openSearch, inline])

  // Panel position (anchored to trigger)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPanelStyle({
      position: "fixed",
      top:      rect.bottom + 8,
      right:    window.innerWidth - rect.right,
      width:    "min(520px, 90vw)",
      zIndex:   9999,
    })
  }, [open])

  const panelProps = {
    query, movies, users: matchedUsers, loading, activeIndex, recentSearches,
    onSelectMovie: (m: MovieResult) => {
      saveRecentSearch(query || m.title)
      router.push(`/movies/${m.id}`)
      if (!inline) closeSearch()
    },
    onSelectUser: (u: UserResult) => {
      router.push(`/user/${u.id}`)
      if (!inline) closeSearch()
    },
    onSelectGenre:   (g: string) => { saveRecentSearch(g); router.push(`/library?genre=${g.toLowerCase()}`); if (!inline) closeSearch() },
    onSelectRecent:  (t: string) => { setQuery(t); inputRef.current?.focus() },
    onRemoveRecent:  (e: React.MouseEvent, t: string) => { e.stopPropagation(); removeRecentSearch(t); setRecentSearches(getRecentSearches()) },
    onSelectTrending:(t: string) => { setQuery(t); inputRef.current?.focus() },
  }

  // Inline mode
  if (inline) {
    return (
      <div className="relative w-full">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
          onClear={() => setQuery("")}
          loading={loading}
          placeholder="Search movies, series..."
          variant="inline"
        />
      </div>
    )
  }

  // Library mode
  if (isLibraryMode) {
    return (
      <div className="relative w-63 md:w-88 lg:w-100">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(v) => {
            setQuery(v)
            const url = new URL(window.location.href)
            if (v) url.searchParams.set("q", v)
            else url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          onClear={() => {
            setQuery("")
            const url = new URL(window.location.href)
            url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          loading={false}
          placeholder="Search movies..."
          variant="library"
        />
      </div>
    )
  }

  // Navbar mode 
  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={open ? closeSearch : openSearch}
        className="flex items-center gap-2 h-8! px-2! duration-200 rounded-md backdrop-blur-2xl! backdrop-saturate-150! hover:scale-110 transition border-white/30 bg-white/10 text-white hover:text-text-primary hover:bg-white/10 border"
      >
        <Search className="h-5 w-5" />
        <span className="hidden md:block text-xs text-white">Search</span>
        <kbd className="hidden md:flex text-[10px] text-white border border-white/15 rounded px-1! py-0.5! font-mono">
          /
        </kbd>
      </button>

      {/* Portal panel — lives outside the navbar DOM entirely */}
      {mounted && open && createPortal(
        <>
          {/* Backdrop — clicking it closes, scrolling it doesn't */}
          <div
            className="fixed inset-0 z-[9998]"
            onMouseDown={closeSearch}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            style={panelStyle}
            className="rounded-xl border border-white/15 bg-[#0e0e10]/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden border"
            // stop clicks/mousedowns inside panel from hitting the backdrop
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Search input inside panel */}
            <div className="px-3! pt-3! pb-2!">
              <SearchInput
                ref={inputRef}
                value={query}
                onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
                onClear={() => setQuery("")}
                loading={loading}
                variant="navbar"
              />
            </div>

            {/* Results — scrollable, stops at panel edge */}
            <div
              className="overflow-y-auto max-h-[min(480px,60vh)] overscroll-contain"
              // prevent scroll from bubbling to body
              onWheel={(e) => e.stopPropagation()}
            >
              <SearchPanel {...panelProps} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

  // return (
  //   <Popover open={open} onOpenChange={(v) => {
  //     if (v) openSearch()
  //       else closeSearch()
  //   }}>

  //     <PopoverTrigger asChild>
  //       {!open ? (
  //         <button
  //           // onClick={openSearch}
  //           className="
  //             flex items-center gap-2 h-8! px-2! duration-200
  //             rounded-md backdrop-blur-2xl! backdrop-saturate-150! hover:scale-110
  //             transition border-white/30 bg-white/10 text-white
  //             hover:text-text-primary hover:bg-white/10 border"
  //         >
  //           <Search className="h-5 w-5" />
  //           <span className="hidden md:block text-xs text-white">
  //             Search
  //           </span>
  //           <kbd className="hidden md:flex text-[10px] text-white border border-white/15 rounded px-1! py-0.5! font-mono">
  //             /
  //           </kbd>
  //         </button>
  //       ) : (
  //         <div />
  //       )}
  //     </PopoverTrigger>

  //     <PopoverContent
  //       align="end"
  //       sideOffset={-16}
  //       className="
  //         w-80 md:w-100 lg:w-130 backdrop-blur-md! backdrop-saturate-150! border p-0! rounded-md flex flex-col gap-2 shadow-xl border-white/30 bg-white/10 text-white "
  //     >
  //       <div
  //         role="combobox"
  //         aria-expanded={open}
  //         aria-controls={listboxId}
  //         aria-haspopup="listbox"
  //       >
  //         <SearchInput
  //           ref={inputRef}
  //           value={query}
  //           onChange={(v) => {
  //             setQuery(v)
  //             setActiveIndex(-1)
  //           }}
  //           onClear={() => setQuery("")}
  //           loading={loading}
  //           variant="navbar"
  //         />

  //         <div
  //           id={listboxId}
  //           role="listbox"
  //           className="max-h-110 overflow-y-auto"
  //         >
  //           <SearchPanel {...panelProps} />
  //         </div>
  //       </div>
  //     </PopoverContent>
  //   </Popover>
  // )





  // ── navbar mode — swap trigger ↔ input ───────────────────────────────
return (
  <>
    <div ref={wrapperRef} className="relative">
      <AnimatePresence mode="wait">
        {!open ? (
          // ── Collapsed trigger button ──────────────────────────────
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={openSearch}
            className="flex items-center gap-2 h-8 px-2 rounded-md border border-white/30 bg-white/10 backdrop-blur-2xl text-white hover:text-text-primary hover:scale-110 transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:block text-xs">Search</span>
            <kbd className="hidden md:flex text-[10px] border border-white/15 rounded px-1 py-0.5 font-mono leading-none text-white/50">
              /
            </kbd>
          </motion.button>
        ) : (
          // ── Expanded input ────────────────────────────────────────
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex items-center h-8 w-[min(520px,80vw)] rounded-md border border-white/30 bg-white/10 backdrop-blur-2xl text-white overflow-hidden"
          >
            <Search className="h-4 w-4 shrink-0 ml-3 text-white/50" />
            <div className="flex-1 min-w-0">
              <SearchInput
                ref={inputRef}
                value={query}
                onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
                onClear={() => setQuery("")}
                loading={loading}
                variant="navbar"
              />
            </div>
            <button
              onClick={closeSearch}
              className="shrink-0 px-3 text-white/40 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Results panel */}
    {mounted && open && createPortal(
      <>
        <div className="fixed inset-0 z-[9998]" onMouseDown={closeSearch} />
        <motion.div
          ref={panelRef}
          style={panelStyle}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="rounded-xl border border-white/20 bg-[#0e0e10]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="overflow-y-auto max-h-[min(480px,60vh)] overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <SearchPanel {...panelProps} />
          </div>
        </motion.div>
      </>,
      document.body
    )}
  </>
)




"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch } from "@/lib/utils/search-bar"
import { SearchInput } from "./search-input"
import { SearchPanel } from "./search-panel"
import { MOCK_USERS } from "@/lib/mock-data"
import { useRouter, usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

const API = "http://localhost:8000"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  inline?: boolean
  onQueryChange?: (q: string) => void
  isLibraryMode?: boolean
}

export default function SearchBar({
  open: externalOpen,
  onOpenChange,
  inline = false,
  onQueryChange,
  isLibraryMode = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = inline ? true : (externalOpen ?? internalOpen)

  const [query,          setQuery]          = useState("")
  const [movies,         setMovies]         = useState<MovieResult[]>([])
  const [loading,        setLoading]        = useState(false)
  const [activeIndex,    setActiveIndex]    = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [mounted,        setMounted]        = useState(false)
  const [panelStyle,     setPanelStyle]     = useState<React.CSSProperties>({})

  const inputRef    = useRef<HTMLInputElement>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)   // the expandable pill
  const panelRef    = useRef<HTMLDivElement>(null)

  const router      = useRouter()
  const pathname    = usePathname()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { closeSearch() }, [pathname]) // eslint-disable-line

  // ── helpers ──────────────────────────────────────────────────────────
  const matchedUsers = useMemo(() =>
    !query ? [] : MOCK_USERS.filter(u =>
      u.username?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3),
  [query])

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    onOpenChange?.(false)
    setActiveIndex(-1)
    setTimeout(() => { setQuery(""); setMovies([]) }, 200)
  }, [onOpenChange])

  // ── fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery) { setMovies([]); return }
    let ignore = false
    const run = async () => {
      try {
        setLoading(true)
        const res  = await fetch(`${API}/search/?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (!ignore)
          setMovies((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [debouncedQuery])

  useEffect(() => { if (inline) onQueryChange?.(query) }, [query, inline, onQueryChange])

  // ── outside click ────────────────────────────────────────────────────
  useEffect(() => {
    if (inline || isLibraryMode) return
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrapperRef.current?.contains(t) && !panelRef.current?.contains(t))
        closeSearch()
    }
    document.addEventListener("mousedown", h, true)
    return () => document.removeEventListener("mousedown", h, true)
  }, [closeSearch, inline, isLibraryMode])

  // ── body scroll lock ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open || inline) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open, inline])

  // ── panel anchor — recalc whenever open or wrapper resizes ───────────
  useEffect(() => {
    if (!open || !wrapperRef.current) return

    const update = () => {
      const rect = wrapperRef.current!.getBoundingClientRect()
      setPanelStyle({
        position: "fixed",
        top:      rect.bottom + 6,
        right:    window.innerWidth - rect.right - 15,
        width:    rect.width,           // panel matches expanded pill width
        zIndex:   9999,
      })
    }

    update()
    // re-anchor after the expand animation finishes
    const t = setTimeout(update, 320)
    window.addEventListener("resize", update)
    return () => { clearTimeout(t); window.removeEventListener("resize", update) }
  }, [open])

  // ── keyboard ─────────────────────────────────────────────────────────
  const allNavigable = useMemo(() => [
    ...movies.slice(0, 4).map(m => ({ type: "movie" as const, item: m })),
    ...matchedUsers.map(u => ({ type: "user" as const, item: u as UserResult })),
  ], [movies, matchedUsers])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && !open && !inline &&
          document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); openSearch(); return
      }
      if (!open) return
      if (e.key === "Escape") { inline ? setQuery("") : closeSearch(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, allNavigable.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, -1)) }
      if (e.key === "Enter" && activeIndex >= 0) {
        const nav = allNavigable[activeIndex]
        if (nav?.type === "movie")  { saveRecentSearch(query); router.push(`/movies/${nav.item.id}`); if (!inline) closeSearch() }
        if (nav?.type === "user")   { router.push(`/user/${(nav.item as UserResult).id}`); if (!inline) closeSearch() }
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, activeIndex, allNavigable, query, router, closeSearch, openSearch, inline])

  const panelProps = {
    query, movies, users: matchedUsers, loading, activeIndex, recentSearches,
    onSelectMovie:   (m: MovieResult) => { saveRecentSearch(query || m.title); router.push(`/movies/${m.id}`); if (!inline) closeSearch() },
    onSelectUser:    (u: UserResult)  => { router.push(`/user/${u.id}`); if (!inline) closeSearch() },
    onSelectGenre:   (g: string)      => { saveRecentSearch(g); router.push(`/library?genre=${g.toLowerCase()}`); if (!inline) closeSearch() },
    onSelectRecent:  (t: string)      => { setQuery(t); inputRef.current?.focus() },
    onRemoveRecent:  (e: React.MouseEvent, t: string) => { e.stopPropagation(); removeRecentSearch(t); setRecentSearches(getRecentSearches()) },
    onSelectTrending:(t: string)      => { setQuery(t); inputRef.current?.focus() },
  }
  
  // ── inline mode ──────────────────────────────────────────────────────
  if (inline) {
    return (
      <div className="relative w-full">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
          onClear={() => setQuery("")}
          loading={loading}
          placeholder="Search movies, series..."
          variant="inline"
        />
      </div>
    )
  }

  // ── library mode ─────────────────────────────────────────────────────
  if (isLibraryMode) {
    return (
      <div className="relative w-63 md:w-88 lg:w-100">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(v) => {
            setQuery(v)
            const url = new URL(window.location.href)
            if (v) url.searchParams.set("q", v)
            else   url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          onClear={() => {
            setQuery("")
            const url = new URL(window.location.href)
            url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          loading={false}
          placeholder="Search movies..."
          variant="library"
        />
      </div>
    )
  }

  // ── navbar mode — expandable pill ────────────────────────────────────
  return (
    <>
      <div ref={wrapperRef} className="relative">
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.button
              key="trigger"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={openSearch}
              className="flex items-center gap-2 h-8 px-2! rounded-md border border-white/20 bg-white/10 backdrop-blur-2xl text-white hover:text-text-primary hover:scale-110 transition-all duration-200"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:block text-xs">Search</span>
              <kbd className="text-[10px] text-white/50 border border-white/15 rounded px-1! py-0.5! font-mono leading-none">
                /
              </kbd>
            </motion.button>
          ):(
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="flex items-center h-8 w-[min(520px,80vw)] rounded-md border border-white/30 bg-white/10 backdrop-blur-2xl text-white overflow-hidden"
            >
              <div className="flex-1 min-w-0">
                <SearchInput
                  ref={inputRef}
                  value={query}
                  onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
                  onClear={() => setQuery("")}
                  loading={loading}
                  variant="navbar"
                />
              </div>
              <button
                onClick={closeSearch}
                className="shrink-0 px-3 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Results panel — portal so it escapes navbar stacking context */}
      {mounted && open && createPortal(
        <>
          {/* Invisible backdrop — catches outside clicks */}
          <div
            className="fixed inset-0 z-[9998]"
            onMouseDown={closeSearch}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            style={panelStyle}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="
              rounded-xl border
              shadow-2xl flex flex-col overflow-hidden p-2!
              backdrop-blur-xl! backdrop-saturate-150! rounded-md! flex flex-col gap-2 border-white/30 bg-white/10 text-white
            "
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="overflow-y-auto max-h-[min(480px,60vh)] overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              <SearchPanel {...panelProps} />
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </>
  )
}




------------------------------------


"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch } from "@/lib/utils/search-bar"
import { SearchInput } from "./search-input"
import { SearchPanel } from "./search-panel"
import { MOCK_USERS } from "@/lib/mock-data"
import { useRouter, usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

const API = "http://localhost:8000"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  inline?: boolean
  onQueryChange?: (q: string) => void
  isLibraryMode?: boolean
}

export default function SearchBar({
  open: externalOpen,
  onOpenChange,
  inline = false,
  onQueryChange,
  isLibraryMode = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = inline ? true : (externalOpen ?? internalOpen)

  const [query,          setQuery]          = useState("")
  const [movies,         setMovies]         = useState<MovieResult[]>([])
  const [loading,        setLoading]        = useState(false)
  const [activeIndex,    setActiveIndex]    = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [mounted,        setMounted]        = useState(false)
  const [panelRect,      setPanelRect]      = useState<DOMRect | null>(null)

  const inputRef   = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const router         = useRouter()
  const pathname       = usePathname()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { closeSearch() }, [pathname]) // eslint-disable-line

  const matchedUsers = useMemo(() =>
    !query ? [] : MOCK_USERS.filter(u =>
      u.username?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3),
  [query])

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
    // measure immediately before setting open so rect is ready
    if (wrapperRef.current)
      setPanelRect(wrapperRef.current.getBoundingClientRect())
    setTimeout(() => inputRef.current?.focus(), 20)
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    onOpenChange?.(false)
    setActiveIndex(-1)
    setTimeout(() => { setQuery(""); setMovies([]) }, 150)
  }, [onOpenChange])

  // ── fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery) { setMovies([]); return }
    let ignore = false
    const run = async () => {
      try {
        setLoading(true)
        const res  = await fetch(`${API}/search/?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (!ignore)
          setMovies((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [debouncedQuery])

  useEffect(() => { if (inline) onQueryChange?.(query) }, [query, inline, onQueryChange])

  // ── outside click ─────────────────────────────────────────────────────
  // ✅ check wrapper AND panel ref — panel is in a portal so not a child of wrapper
  useEffect(() => {
    if (inline || isLibraryMode) return
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      const insideWrapper = wrapperRef.current?.contains(t)
      const insidePanel   = panelRef.current?.contains(t)
      if (!insideWrapper && !insidePanel) closeSearch()
    }
    document.addEventListener("mousedown", h, true)
    return () => document.removeEventListener("mousedown", h, true)
  }, [closeSearch, inline, isLibraryMode])

  // ── measure wrapper whenever open state or window size changes ────────
  // ✅ no setTimeout — measure synchronously on open, and on resize
  useEffect(() => {
    if (!open) return
    const measure = () => {
      if (wrapperRef.current)
        setPanelRect(wrapperRef.current.getBoundingClientRect())
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [open])

  // ── body scroll lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open || inline) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open, inline])

  // ── keyboard ──────────────────────────────────────────────────────────
  const allNavigable = useMemo(() => [
    ...movies.slice(0, 4).map(m => ({ type: "movie" as const, item: m })),
    ...matchedUsers.map(u => ({ type: "user" as const, item: u as UserResult })),
  ], [movies, matchedUsers])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && !open && !inline &&
          document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); openSearch(); return
      }
      if (!open) return
      if (e.key === "Escape") { inline ? setQuery("") : closeSearch(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, allNavigable.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, -1)) }
      if (e.key === "Enter" && activeIndex >= 0) {
        const nav = allNavigable[activeIndex]
        if (nav?.type === "movie") { saveRecentSearch(query); router.push(`/movies/${nav.item.id}`); if (!inline) closeSearch() }
        if (nav?.type === "user")  { router.push(`/user/${(nav.item as UserResult).id}`); if (!inline) closeSearch() }
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, activeIndex, allNavigable, query, router, closeSearch, openSearch, inline])

  const panelProps = {
    query, movies, users: matchedUsers, loading, activeIndex, recentSearches,
    onSelectMovie:    (m: MovieResult) => { saveRecentSearch(query || m.title); router.push(`/movies/${m.id}`); if (!inline) closeSearch() },
    onSelectUser:     (u: UserResult)  => { router.push(`/user/${u.id}`); if (!inline) closeSearch() },
    onSelectGenre:    (g: string)      => { saveRecentSearch(g); router.push(`/library?genre=${g.toLowerCase()}`); if (!inline) closeSearch() },
    onSelectRecent:   (t: string)      => { setQuery(t); inputRef.current?.focus() },
    onRemoveRecent:   (e: React.MouseEvent, t: string) => { e.stopPropagation(); removeRecentSearch(t); setRecentSearches(getRecentSearches()) },
    onSelectTrending: (t: string)      => { setQuery(t); inputRef.current?.focus() },
  }

  // ── derived panel position from rect ─────────────────────────────────
  const panelStyle: React.CSSProperties = panelRect ? {
    position: "fixed",
    top:      panelRect.bottom + 6,
    right:    window.innerWidth - panelRect.right,
    width:    open ? "min(520px, 80vw)" : panelRect.width,
    zIndex:   9999,
  } : { display: "none" }

  // ── inline mode ───────────────────────────────────────────────────────
  if (inline) {
    return (
      <div className="relative w-full">
        <SearchInput ref={inputRef} value={query}
          onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
          onClear={() => setQuery("")} loading={loading}
          placeholder="Search movies, series..." variant="inline"
        />
      </div>
    )
  }

  // ── library mode ──────────────────────────────────────────────────────
  if (isLibraryMode) {
    return (
      <div className="relative w-63 md:w-88 lg:w-100">
        <SearchInput ref={inputRef} value={query}
          onChange={(v) => {
            setQuery(v)
            const url = new URL(window.location.href)
            if (v) url.searchParams.set("q", v)
            else   url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          onClear={() => {
            setQuery("")
            const url = new URL(window.location.href)
            url.searchParams.delete("q")
            window.history.replaceState({}, "", url.toString())
          }}
          loading={false} placeholder="Search movies..." variant="library"
        />
      </div>
    )
  }

  // ── navbar mode ───────────────────────────────────────────────────────
  return (
    <>
      <div ref={wrapperRef}>
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.button
              key="trigger"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              onClick={openSearch}
              className="flex items-center gap-2 h-8 px-2 rounded-md border border-white/20 bg-white/10 backdrop-blur-2xl text-white hover:text-text-primary hover:scale-110 transition-all duration-200"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:block text-xs">Search</span>
              <kbd className="text-[10px] text-white/50 border border-white/15 rounded px-1 py-0.5 font-mono leading-none">
                /
              </kbd>
            </motion.button>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="flex items-center h-8 w-[min(520px,80vw)] rounded-md border border-white/30 bg-white/10 backdrop-blur-2xl text-white overflow-hidden"
            >
              <Search className="h-4 w-4 shrink-0 ml-2.5 text-white/40" />
              <div className="flex-1 min-w-0">
                <SearchInput
                  ref={inputRef}
                  value={query}
                  onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
                  onClear={() => setQuery("")}
                  loading={loading}
                  variant="navbar"
                />
              </div>
              <button
                onClick={closeSearch}
                className="shrink-0 px-2.5 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mounted && open && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998]" onMouseDown={closeSearch} />

          {/* Panel — no entry animation delay, appears instantly */}
          <motion.div
            ref={panelRef}
            style={panelStyle}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="rounded-xl border border-white/20 bg-[#0e0e10]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="overflow-y-auto max-h-[min(480px,60vh)] overscroll-contain p-2"
              onWheel={(e) => e.stopPropagation()}
            >
              <SearchPanel {...panelProps} />
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </>
  )
}