"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { useRouter } from "next/navigation"
import { MovieResult, UserResult } from "@/types/search"
import { getRecentSearches, saveRecentSearch, removeRecentSearch } from "@/lib/utils/search-bar"
import { SearchInput } from "./search-input"
import { SearchPanel } from "./search-panel"
import { MOCK_USERS } from "@/lib/mock-data"
import { createPortal } from "react-dom"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  inline?: boolean
  onQueryChange?: (q: string) => void
  isLibraryMode?: boolean
}

export default function SearchBar({ open: externalOpen, onOpenChange, inline = false, onQueryChange, isLibraryMode = false }: Props) {
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
    const debouncedQuery = useDebounce(query, 300)

    const matchedUsers = useMemo(() =>
        !query ? [] : MOCK_USERS.filter(u =>
        u.username?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3),
    [query])

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

    useEffect(() => {
        if (!debouncedQuery) return
        let ignore = false
        const run = async () => {
            try {
                setLoading(true)

                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
                const data = await res.json()

                if (!ignore) {
                    setMovies((data.results ?? []).filter((r: MovieResult) => r.type === "movie"))
                }
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        run()
        return () => {
            ignore = true
        }
    }, [debouncedQuery])

    useEffect(() => { if (inline) onQueryChange?.(query) }, [query, inline, onQueryChange])
    
    useEffect(() => { if (open && !inline) inputRef.current?.focus() }, [open, inline])

    useEffect(() => {
        if (inline) return
        const h = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) closeSearch() }
        document.addEventListener("mousedown", h)
        return () => document.removeEventListener("mousedown", h)
    }, [closeSearch, inline])

    // useEffect(() => {
    //     if (!open || inline) return
    //     const h = () => closeSearch()
    //     window.addEventListener("scroll", h, { passive: true })
    //     return () => window.removeEventListener("scroll", h)
    // }, [open, closeSearch, inline])
    useEffect(() => {
      if (!open || inline) return

      document.body.style.overflow = "hidden"

      return () => {
        document.body.style.overflow = ""
      }
    }, [open, inline])

    const allNavigable = useMemo(() => [
        ...movies.slice(0, 4).map(m => ({ type: "movie" as const, item: m })),
        ...matchedUsers.map(u => ({ type: "user" as const, item: u as UserResult })),
    ], [movies, matchedUsers])

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
        if (!open) return
        if (e.key === "Escape") {
          if (inline) {
            setQuery("")
          } else {
            closeSearch()
          }
          return
        }
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, allNavigable.length - 1)) }
        if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, -1)) }
        if (e.key === "Enter" && activeIndex >= 0) {
            const nav = allNavigable[activeIndex]
            if (nav?.type === "movie") { saveRecentSearch(query); router.push(`/movie/${nav.item.id}`); if (!inline) closeSearch() }
            if (nav?.type === "user") { router.push(`/user/${(nav.item as UserResult).id}`); if (!inline) closeSearch() }
        }
        }
        window.addEventListener("keydown", h)
        return () => window.removeEventListener("keydown", h)
    }, [open, activeIndex, allNavigable, query, router, closeSearch, inline])

    const panelProps = {
        query, movies, users: matchedUsers, loading, activeIndex, recentSearches,
        onSelectMovie: (m: MovieResult) => { saveRecentSearch(query || m.title); router.push(`/movie/${m.id}`); if (!inline) closeSearch() },
        onSelectUser: (u: UserResult) => { router.push(`/user/${u.id}`); if (!inline) closeSearch() },
        onSelectGenre: (g: string) => { saveRecentSearch(g); router.push(`/browse?genre=${g.toLowerCase()}`); if (!inline) closeSearch() },
        onSelectRecent: (t: string) => { setQuery(t); inputRef.current?.focus() },
        onRemoveRecent: (e: React.MouseEvent, t: string) => { e.stopPropagation(); removeRecentSearch(t); setRecentSearches(getRecentSearches()) },
        onSelectTrending: (t: string) => { setQuery(t); inputRef.current?.focus() },
    }

  // Inline mode
  if (inline) {
    return (
      <div className="relative w-full" ref={containerRef}>
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

  const listboxId = "search-listbox"

  // Navbar dropdown mode
  // return (
  //   <div ref={containerRef} className="relative flex items-center">

  //     <AnimatePresence>
  //       {open && (
  //         <motion.div
  //           initial={{ opacity: 0 }}
  //           animate={{ opacity: 1 }}
  //           exit={{ opacity: 0 }}
  //           transition={{ duration: 0.2 }}
  //           className="fixed inset-0 z-40 bg-white/10"
  //           onClick={closeSearch}
  //         />
  //       )}
  //     </AnimatePresence>
      
  //     {!open && (
  //       <button
  //         onClick={openSearch}
  //         className="flex items-center gap-2 rounded-md border h-8! px-2! backdrop-blur-2xl! border-white/30 bg-white/10 text-white/60 hover:text-white transition-all duration-200 hover:scale-105"
  //       >
  //         <Search className="h-5 w-5" />
  //         <span className="hidden md:block text-xs text-white">Search</span>
  //         <kbd className="hidden md:flex text-[10px] text-white border border-white/15 rounded px-1 py-0.5 font-mono">/</kbd>
  //       </button>
  //     )}

  //     <AnimatePresence>
  //       {open && (
  //         <motion.div
  //           initial={{ width: 40, opacity: 0 }}
  //           animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? 320 : 520, opacity: 1 }}
  //           exit={{ width: 40, opacity: 0 }}
  //           transition={{ type: "spring", stiffness: 320, damping: 28 }}
  //           className="absolute right-0 z-40 "
  //         >
  //           <div role="combobox" aria-expanded={open}  aria-controls={listboxId} aria-haspopup="listbox">
  //             <SearchInput
  //               ref={inputRef}
  //               value={query}
  //               onChange={(v) => { setQuery(v); setActiveIndex(-1) }}
  //               onClear={() => setQuery("")}
  //               loading={loading}
  //               variant="navbar"
  //             />
  //             {/* {createPortal( */}
  //               <motion.div
  //                 initial={{ opacity: 0, y: -4 }}
  //                 animate={{ opacity: 1, y: 0 }}
  //                 exit={{ opacity: 0, y: -4 }}
  //                 transition={{ duration: 0.18 }}
  //                 id={listboxId}
  //                 role="listbox"
  //                 className="rounded-b-md border border-t-0 border-white/30 bg-white/10 backdrop-blur-2xl overflow-hidden absolute right-0 left-0 mt-0!"
  //                 style={{ maxHeight: "520px", overflowY: "auto" }}
  //               >
  //                 <SearchPanel {...panelProps} />
  //               </motion.div>,
  //             {/* document.body
  //           )} */}
  //           </div>
  //         </motion.div>
  //       )}
        
  //     </AnimatePresence>
  //   </div>
  // )
  return (
    <Popover open={open} onOpenChange={(v) => {
      if (v) openSearch()
        else closeSearch()
    }}>

      <PopoverTrigger asChild>
        {!open ? (
          <button
            // onClick={openSearch}
            className="
              flex items-center gap-2 h-8! px-2! duration-200
              rounded-md backdrop-blur-2xl! backdrop-saturate-150! hover:scale-110
              transition border-white/30 bg-white/10 text-white
              hover:text-text-primary hover:bg-white/10 border"
          >
            <Search className="h-5 w-5" />
            <span className="hidden md:block text-xs text-white">
              Search
            </span>
            <kbd className="hidden md:flex text-[10px] text-white border border-white/15 rounded px-1! py-0.5! font-mono">
              /
            </kbd>
          </button>
        ) : (
          <div />
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={-16}
        className="
          w-80 sm:w-100 md:w-130 backdrop-blur-md! backdrop-saturate-150! border p-0! rounded-md flex flex-col gap-2 shadow-xl border-white/30 bg-white/10 text-white"
      >
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(v) => {
              setQuery(v)
              setActiveIndex(-1)
            }}
            onClear={() => setQuery("")}
            loading={loading}
            variant="navbar"
          />

          <div
            id={listboxId}
            role="listbox"
            className="max-h-100 overflow-y-auto"
          >
            <SearchPanel {...panelProps} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}