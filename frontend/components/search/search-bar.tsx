"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch } from "@/lib/utils/search-bar"
import { SearchInput } from "./search-input"
import { SearchPanel } from "./search-panel"
import { useRouter, usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
  const [matchedUsers,   setMatchedUsers]   = useState<UserResult[]>([])
  const [loading,        setLoading]        = useState(false)
  const [activeIndex,    setActiveIndex]    = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [mounted,        setMounted]        = useState(false)
  // const [panelStyle,     setPanelStyle]     = useState<React.CSSProperties>({})
  const [panelRect,      setPanelRect]      = useState<DOMRect | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)   // the expandable pill
  const panelRef    = useRef<HTMLDivElement>(null)

  const router      = useRouter()
  const pathname    = usePathname()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { closeSearch() }, [pathname]) // eslint-disable-line

  //  user search
  useEffect(() => {
    if (!debouncedQuery) { setMatchedUsers([]); return }
    let ignore = false
    const run = async () => {
      try {
        const res  = await fetch(`${API}/users/?q=${encodeURIComponent(debouncedQuery)}`,
         { 
          method: "GET",
          credentials: "include"
        }
        )
        const data = await res.json()

        console.log("User search results:", data)
        if (!ignore)
          setMatchedUsers(
            (data?.results ?? []).slice(0, 3).map((u: { id: number; username: string; avatar: string | null }) => ({
              type: "user" as const,
              id: u.id,
              username: u.username,
              avatar: u.avatar || null,
            }))
          )
      } catch {
        if (!ignore) setMatchedUsers([])
      }
    }
    run()
    return () => { ignore = true }
  }, [debouncedQuery])

  const openSearch = useCallback(() => {
    setInternalOpen(true)
    onOpenChange?.(true)
    setRecentSearches(getRecentSearches())
    if (wrapperRef.current)
      setPanelRect(wrapperRef.current.getBoundingClientRect())
    setTimeout(() => inputRef.current?.focus(), 20)
  }, [onOpenChange])

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    onOpenChange?.(false)
    setActiveIndex(-1)
    setTimeout(() => { setQuery(""); setMovies([]); setMatchedUsers([]) }, 200)
  }, [onOpenChange])

  //  fetch 
  useEffect(() => {
    if (!debouncedQuery) { setMovies([]); return }
    let ignore = false
    const run = async () => {
      try {
        setLoading(true)
        console.log("Searching for:", debouncedQuery)
        const res  = await fetch(`${API}/search/?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        console.log("Search results:", data)
        if (!ignore)
          // setMovies((data ?? []).filter((r: MovieResult) => r.type === "movie"))
          setMovies(
            Array.isArray(data?.results)
              ? data.results.filter((r: MovieResult) => r.type === "movie")
              : []
          );
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [debouncedQuery])

  useEffect(() => { if (inline) onQueryChange?.(query) }, [query, inline, onQueryChange])

  //  outside click 
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

  //  body scroll lock ─
  useEffect(() => {
    if (!open || inline) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open, inline])

  //  panel anchor — recalc whenever open or wrapper resizes ─
  // const panelStyle: React.CSSProperties = panelRect ? {
  //   position: "fixed",
  //   top:      panelRect.bottom + 6,
  //   left:     panelRect.left,
  //   width:    open ? "min(520px, 80vw)" : panelRect.width,
  //   zIndex:   9999,
  // } : { display: "none" }

  const updatePanelRect = useCallback(() => {
    if (!wrapperRef.current) return
    setPanelRect(wrapperRef.current.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!open) return

    updatePanelRect()

    window.addEventListener("resize", updatePanelRect)
    window.addEventListener("scroll", updatePanelRect, true)

    return () => {
      window.removeEventListener("resize", updatePanelRect)
      window.removeEventListener("scroll", updatePanelRect, true)
    }
  }, [open, updatePanelRect])

  useEffect(() => {
    if (!open) return

    const id = requestAnimationFrame(function loop() {
      updatePanelRect()
      requestAnimationFrame(loop)
    })

    return () => cancelAnimationFrame(id)
  }, [open, updatePanelRect])

  const panelStyle: React.CSSProperties = panelRect
    ? {
        position: "fixed",
        top: panelRect.bottom + 6,
        left: panelRect.left,

        width: open
          ? "min(520px, 80vw)"
          : `${panelRect.width}px`,

        zIndex: 9999,
      }
    : { display: "none" }

  //  keyboard ─
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
        if (nav?.type === "user")   { router.push(`/users/${(nav.item as UserResult).id}`); if (!inline) closeSearch() }
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, activeIndex, allNavigable, query, router, closeSearch, openSearch, inline])

  const panelProps = {
    query, movies, users: matchedUsers, loading, activeIndex, recentSearches,
    onSelectMovie:   (m: MovieResult) => { saveRecentSearch(query || m.title); router.push(`/movies/${m.id}`); if (!inline) closeSearch() },
    onSelectUser:    (u: UserResult)  => { router.push(`/users/${u.id}`); if (!inline) closeSearch() },
    onSelectGenre:   (g: string)      => { saveRecentSearch(g); router.push(`/library?genre=${g.toLowerCase()}`); if (!inline) closeSearch() },
    onSelectRecent:  (t: string)      => { setQuery(t); inputRef.current?.focus() },
    onRemoveRecent:  (e: React.MouseEvent, t: string) => { e.stopPropagation(); removeRecentSearch(t); setRecentSearches(getRecentSearches()) },
    onSelectTrending:(t: string)      => { setQuery(t); inputRef.current?.focus() },
  }
  
  //  inline mode 
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

  //  library mode ─
  if (isLibraryMode) {
    return (
      <div className="relative w-[min(52vw,16rem)] sm:w-63 md:w-88 xl:w-100">
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
          autoFocus={false}
        />
      </div>
    )
  }

  //  navbar mode — expandable pill 
  return (
    <>
      <div ref={wrapperRef} className="relative">
        <AnimatePresence mode="sync">
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
              {/* <button
                onClick={closeSearch}
                className="shrink-0 px-3 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button> */}
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
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
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