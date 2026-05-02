"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Film, Search, Users, X } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { SearchResult } from "@/types/search"
import { useRouter } from "next/navigation"
import { searchMock } from "@/lib/mock-data"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function SearchBar({ open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen  // ← single source of truth

  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeSection, setActiveSection] = useState<"movie" | "user" | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  const results = useMemo(() => {
    if (!debouncedQuery) return []
    return searchMock(debouncedQuery)
  }, [debouncedQuery])

  const movies = results.filter((r) => r.type === "movie")
  const users = results.filter((r) => r.type === "user")

  const openSearch = () => {
    setInternalOpen(true)
    onOpenChange?.(true)
  }

  const closeSearch = useCallback(() => {
    setInternalOpen(false)
    setQuery("")
    setActiveIndex(-1)
    setActiveSection(null)
    onOpenChange?.(false)
  }, [onOpenChange])

  const handleSelect = useCallback(
    (item: SearchResult) => {
      if (item.type === "movie") {
        router.push(`/movie/${item.data.id}`)
      } else {
        router.push(`/user/${item.data.id}`)
      }
      closeSearch()
    },
    [router, closeSearch]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === "Escape") { closeSearch(); return }
      if (e.key === "ArrowDown") {
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === "Enter" && activeIndex >= 0) handleSelect(results[activeIndex])
    },
    [open, results, activeIndex, handleSelect, closeSearch]
  )

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeSearch()
    },
    [closeSearch]
  )

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [handleKeyDown])

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [handleClickOutside])

  return (
    <div ref={containerRef} className="relative flex items-center">

      {!open && (
        <button
          onClick={openSearch}
          className="hover:text-text-primary hover:scale-110 transition rounded-[6px] border h-7 md:h-8! px-1! md:px-2! backdrop-blur-2xl! border-white/30 bg-white/10 text-white"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 40, opacity: 0 }}
            animate={{
              width: typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 370,
              opacity: 1,
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "keyframes", stiffness: 300, damping: 25 }}
            className="absolute right-0"
          >
            {/* INPUT */}
            <div className="flex items-center gap-2 rounded-[6px] px-2! py-1! md:py-1.5! border backdrop-blur-md! backdrop-saturate-150! border-white/30 bg-white/10 text-white">
              <Search className="h-5 w-5 text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users or movies..."
                onBlur={() => {
                  requestAnimationFrame(() => {
                    if (!query) closeSearch()
                  })
                }}
                className="bg-transparent text-text-primary outline-none flex-1 text-sm placeholder:text-text-muted"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-text-muted hover:text-text-primary">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* DROPDOWN */}
            <AnimatePresence>
              {query && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 my-1! z-50"
                >
                  <Command
                    className="rounded-[6px] border border-white/30 bg-white/5 backdrop-blur-md shadow-2xl"
                    shouldFilter={false}
                  >
                    <CommandList className="max-h-70 overflow-y-auto p-1!">

                      {results.length === 0 && (
                        <CommandEmpty className="text-center text-gray-500 text-sm py-4!">
                          No results found
                        </CommandEmpty>
                      )}

                      {movies.length > 0 && (
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-2! px-2!">
                              <Film className="h-3 w-3 text-text-muted" />
                              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Movies</span>
                            </div>
                          }
                        >
                          {movies.map((item, i) => {
                            const isActive = activeSection === "movie" && activeIndex === i
                            return (
                              <CommandItem
                                key={`movie-${item.data.id}`}
                                onSelect={() => handleSelect(item)}
                                onMouseEnter={() => { setActiveSection("movie"); setActiveIndex(i) }}
                                className={`flex items-center gap-3! px-2! py-1! cursor-pointer rounded-[6px] overflow-hidden
                                  data-[selected=true]:bg-text-primary/10
                                  ${isActive ? "bg-text-primary/10" : "hover:bg-white/5"}`}
                              >
                                <div
                                  className="w-10 h-14 flex-shrink-0 rounded-l-[6px] bg-no-repeat bg-center bg-cover"
                                  style={{ backgroundImage: `url(${item.data.poster_path})`, backgroundSize: "cover", backgroundPosition: "center" }}
                                />
                                <div className="py-1">
                                  <p className="text-text-primary text-sm font-medium">{item.data.title}</p>
                                  <p className="text-text-muted text-xs">{item.data.release_date.slice(0, 4)}</p>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      )}

                      {movies.length > 0 && users.length > 0 && (
                        <CommandSeparator className="bg-text-primary/10 my-1!" />
                      )}

                      {users.length > 0 && (
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-2! px-2! py-2!">
                              <Users className="h-3 w-3 text-text-muted" />
                              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Users</span>
                            </div>
                          }
                        >
                          {users.map((item, i) => {
                            const isActive = activeSection === "user" && activeIndex === i
                            return (
                              <CommandItem
                                key={`user-${item.data.id}`}
                                onSelect={() => handleSelect(item)}
                                onMouseEnter={() => { setActiveSection("user"); setActiveIndex(i) }}
                                className={`flex items-center gap-3! px-2! py-1! cursor-pointer rounded-[6px]
                                  data-[selected=true]:bg-text-primary/10
                                  ${isActive ? "bg-text-primary/10" : "hover:bg-white/5"}`}
                              >
                                <div
                                  className="w-8 h-8 flex-shrink-0 rounded-[6px] bg-no-repeat bg-center bg-cover"
                                  style={{ backgroundImage: `url(${item.data.avatar})` }}
                                />
                                <p className="text-text-primary text-sm">@{item.data.username}</p>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      )}

                    </CommandList>
                  </Command>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}