"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MovieCard } from "@/types/search"
import { Movie } from "@/types/search"
import { mapToCards } from "@/lib/mock-data"
import Image from "next/image"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useCarousel } from "../carousel/use-carousel"
import { containerVariants } from "@/lib/annimations/continue-watching-variants"
import { Button } from "../ui/button"
import { TooltipButton } from "../ui/tool-tip-button"
import { Badge } from "../ui/badge"
import { itemVariants } from "@/lib/annimations/hero-variants"
import { formatVotes, getReleaseYear } from "@/lib/utils/movie"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import HeaderTitle from '../ui/header-title';

type MovieRowProps = {
  title: string
  endpoint: string
}

export default function PrimeRow({ title, endpoint }: MovieRowProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)
  const [movies, setMovies] = useState<MovieCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        const results: Movie[] = Array.isArray(data) ? data : data?.results ?? []
        setMovies(mapToCards(results))
      } catch (err) {
        console.error("Fetch error:", err)
        setMovies([])
      }
      finally {
        setLoading(false)
      }
    }
    fetchMovies()
  }, [endpoint])

  const { scrollRef, canScrollLeft, canScrollRight, checkScroll, scroll, startAutoScroll, stopAutoScroll } = useCarousel()
  
  if (loading)
    return <CarouselSkeleton title={title} isprime={true} /> 
  
  return (
    <section className="flex flex-col gap-1">
      {/* Header */}
      <HeaderTitle title={title} />

      <div className="relative">
        <div
          className={` absolute left-0 bottom-1 h-100! w-20! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={() => startAutoScroll("left")}
          onMouseLeave={stopAutoScroll}
        >
          <TooltipButton
            onClick={() => scroll("left")}
            className="w-20 h-100 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[2px] transition-all duration-200"
            label="Scroll Left"
          >
            <ChevronLeft className="w-8 h-8" />
          </TooltipButton>
        </div>

        <div
            className={` absolute right-0 bottom-1 h-100! w-20! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onMouseEnter={() => startAutoScroll("right")}
            onMouseLeave={stopAutoScroll}
          >
            <TooltipButton
              onClick={() => scroll("right")}
              className="w-20 h-100 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[2px] transition-all duration-200"
              label="Scroll Right"
            >
              <ChevronRight className="w-8 h-8" />
            </TooltipButton>
        </div>

                {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-30 bg-linear-to-r from-background to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-30 bg-linear-to-l from-background to-transparent" />
        )}

        {/* Carousel */}
        <motion.div
          ref={scrollRef}
          onScroll={checkScroll}
          variants={containerVariants}
          initial={false}
          animate="visible"
          className="flex gap-2 overflow-x-auto w-full"
          style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              overflowY: "visible",
              paddingTop: "3px",
              paddingBottom: "3px",
            }}
        >
          {movies.map((movie, index) => {
            const isActive = index === activeIndex
            const releaseYear = getReleaseYear(movie.release_date)

            return (
              <motion.div
                key={movie.id}
                initial={false}
                animate={{ width: isActive ? 700 : 250 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className="relative shrink-0 h-100 rounded-md overflow-hidden cursor-pointer "
              >
                {/* BACKGROUND — backdrop when active, poster when collapsed */}
                <AnimatePresence mode="wait">
                  {isActive ? (
                    <motion.div
                      key="backdrop"
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0  "
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`}
                        alt={movie.title}
                        fill
                        priority
                        sizes="500px"
                        className="object-cover"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="poster"
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                        alt={movie.title}
                        fill
                        priority
                        sizes="160px"
                        className="object-cover"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute top-1 right-2">
                  <TooltipButton
                    label={`${movie.availability === "free" ? "FREE" : "PREMIUM"}`}
                  >
                    <span className={`text-[10px] font-bold px-1.5! py-0.5! rounded-md ${
                      movie.availability === "free"
                        ? "bg-[#16a34a] text-white"
                        : "bg-[#f59e0b] text-white"
                    }`}>
                      {movie.availability === "free" ? "FREE" : "PREMIUM"}
                    </span>
                  </TooltipButton>
                </div>

                {/* GRADIENT — stronger on active */}
                <motion.div
                  animate={{ opacity: isActive ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                  style={{
                    background: isActive
                      ? `linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 20%, transparent 50%),
                        linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 10%)`
                      : `linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 10%)`,
                  }}
                />

                {/* COLLAPSED — just number badge at bottom */}
                <AnimatePresence>
                  {!isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-2 left-0 right-0 flex justify-center "
                    >
                      <span className="text-white/60 text-[10px] font-title px-2! py-0.5 bg-black/40 rounded-full truncate max-w-[90%] text-center">
                        {movie.title}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* EXPANDED CONTENT — left side panel */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.28, delay: 0.08 }}
                      className="absolute inset-y-0 left-0 w-full h-full flex flex-col justify-end px-10! py-15! gap-2  rounded-lg"
                    >
                      {/* Title */}
                      <h3 className="text-white font-title text-4xl leading-tight line-clamp-2 mb-3!">
                        {movie.title}
                      </h3>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Tooltip key="More Informations">
                          <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-white/30 bg-white/10 hover:bg-white/20 text-white px-3! py-1.5! rounded-md shadow-md hover:text-white hover:shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            More Informations
                          </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="whitespace-nowrap
                                text-sm font-medium text-background bg-white
                                px-2! py-2! rounded-lg border border-white/10
                                pointer-events-none z-50 shadow-lg"
                            >
                              More details about {movie.title}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip
                          key="Add to List"
                        >
                          <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="border-white/30 bg-white/10 hover:bg-white/20 text-white h-9.5 w-9.5 rounded-md shadow-md hover:text-white hover:shadow-lg transition-all duration-200 hover:scale-110"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p
                                className="whitespace-nowrap
                                text-sm font-medium text-background bg-white
                                px-2! py-2! rounded-lg border border-white/10
                                pointer-events-none z-50 shadow-lg"
                              >
                                Add {movie.title} to your list
                              </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Meta */}
                      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2! md:gap-2! mb-2!">
                          <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
                              {movie.rating?.toFixed(1) || "N/A"} ({formatVotes(movie.vote_count || 0)})
                          </Badge>
                          <span className="text-text-muted/50 hidden md:inline">|</span>
                          <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                              {releaseYear}
                          </Badge>
                          <span className="text-text-muted/50 hidden md:inline">|</span>
                          <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                              2h 15m
                          </Badge>
                          <span className="text-text-muted/50 hidden md:inline">|</span>
                          <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                              Action
                          </Badge>
                      </motion.div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}