"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { containerVariants, cardVariants } from "@/lib/annimations/continue-watching-variants"
import { continueWatchingMovies, mapTrendingToContinueWatching } from "@/lib/mock-data"

type ContinueWatchingMovie = {
  id: number
  title: string
  progress: number
  image: string
  duration: string
  remainingTime: string
}

export default function ContinueWatching() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [movies, setContinueWatching] = useState<ContinueWatchingMovie[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchTopMovies = async () => {
      try {
        const res = await fetch("/api/movies/top")
        const data = await res.json()

        // Map TMDB data to our ContinueWatchingMovie type
        const mapped = mapTrendingToContinueWatching(data)

        setContinueWatching(mapped)
      } catch (error) {
        console.error("Failed to fetch top movies:", error)
        setContinueWatching(continueWatchingMovies) // Fallback to mock data
      }
    }
    fetchTopMovies()
  }, [])

  // console.log("Continue Watching movies state:", movies)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" })
      setTimeout(checkScroll, 300)
    }
  }

  const startAutoScroll = (direction: "left" | "right") => {
    if (autoScrollRef.current) return
    autoScrollRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollBy({ left: direction === "left" ? -6 : 6, behavior: "auto" })
        checkScroll()
      }
    }, 16)
  }

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }
  }

  // Fix 2: Removed whileHover — only use animate so they don't fight each other
  const getCardAnimation = (index: number) => {
    if (hoveredIndex === null) return { scale: 1, x: 0, filter: "brightness(1)" }
    if (hoveredIndex === index) return { scale: 1.12, x: 0, filter: "brightness(1.15)" }
    const distance = index - hoveredIndex
    if (distance === -1) return { scale: 0.96, x: -12, filter: "brightness(0.6)" }
    if (distance === 1)  return { scale: 0.96, x: 12,  filter: "brightness(0.6)" }
    return { scale: 0.94, x: 0, filter: "brightness(0.45)" }
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-2xl font-title text-text-primary tracking-tight">
          Continue Watching
        </h2>
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative group">
        {/* Left hover scroll zone */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-10 z-20 cursor-w-resize bg-linear-to-r from-background to-transparent transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
          onMouseEnter={() => startAutoScroll("left")}
          onMouseLeave={stopAutoScroll}
        />

        {/* Right hover scroll zone */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-10 z-20 cursor-e-resize bg-linear-to-l from-background to-transparent transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
          onMouseEnter={() => startAutoScroll("right")}
          onMouseLeave={stopAutoScroll}
        />

        {/* Fix 3: Removed px-16 padding and debug border classes, added py-6 for hover pop room */}
        <motion.div
          ref={scrollRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto overflow-y-visible py-3! scrollbar-hide  z-50" // debug borders
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {continueWatchingMovies.map((movie, index) => (
            <motion.div
              key={movie.id}
              variants={cardVariants}
              className="shrink-0 relative overflow-visible"
              style={{ zIndex: hoveredIndex === index ? 20 : 1 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              animate={getCardAnimation(index)}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 22,
                mass: 0.8,
              }}
            >
              {/* Card Shell */}
              <div className="relative w-64 md:w-[320px] aspect-video rounded-[6px] overflow-hidden z-50">
                <Image
                  src={movie.image}
                  alt={movie.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 256px, 320px"
                  className="object-cover transition-transform duration-700 ease-out"
                  style={{
                    // transform: hoveredIndex === index ? "scale(1.08)" : "scale(1)",
                  }}
                />

                {movie.image ? (
                  <Image
                    src={movie.image}
                    alt={movie.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 256px, 320px"
                    className="object-cover transition-transform duration-700 ease-out"
                    quality={0}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/15 text-4xl">🎬</span>
                  </div>
                )}

                {/* Bottom info overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm truncate drop-shadow">{movie.title}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${movie.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile dots */}
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          {movies.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${index === 0 ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}