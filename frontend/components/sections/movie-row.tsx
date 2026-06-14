"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Play, Plus, Check } from "lucide-react"
import { useWatchlistToggle } from "@/hooks/use-watchlist-toggle"

import Carousel from "@/components/carousel/carousel"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { useHoverPortal } from "@/components/carousel/use-hover-portal"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { Movie, MovieCard, MovieResult } from "@/types/search"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"
import { AvailabilityBadge } from "../ui/AvailabilityBadge"
import Link from "next/link"
import { useRuntimes } from "@/hooks/use-runtimes"
import { useLanguage } from "@/hooks/use-language"

type MovieRowProps = {
  title: string
  endpoint: string
  priority?: boolean // only true for the first visible row
}

function RowInfoPanel({ movie }: { movie: MovieResult }) {
  const { inWatchlist, toggle, loading } = useWatchlistToggle(movie)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-text-primary/50 text-xs line-clamp-2">{movie.overview}</p>
      <div className="flex items-center gap-2 mt-1">
        <TooltipButton
          label="Watch now"
          className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:bg-text-primary/80 transition"
        >
          <Link href={`/movies/${movie.id}`}>
            <Play className="h-4 w-4 text-background fill-background ml-0.5" />
          </Link>
        </TooltipButton>
        <TooltipButton
          label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
            inWatchlist
              ? "border-text-primary bg-text-primary/20 hover:bg-text-primary/30"
              : "border-text-primary/30 hover:border-text-primary"
          } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={toggle}
        >
          {inWatchlist
            ? <Check className="h-4 w-4 text-text-primary" />
            : <Plus className="h-4 w-4 text-text-primary" />
          }
        </TooltipButton>
      </div>
    </div>
  )
}

export default function MovieRow({ title, endpoint, priority }: MovieRowProps) {
  const [movies, setMovies] = useState<MovieResult[]>([])
  const [loading, setLoading] = useState(true)
  const { langCode } = useLanguage()
  const sep = endpoint.includes("?") ? "&" : "?"
  const effectiveEndpoint = `${endpoint}${sep}lang=${langCode}`
  const {
    hover,
    handleMouseEnter,
    handleMouseLeave,
    clearHoverTimeout,
    getPortalStyle,
  } = useHoverPortal()

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const run = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${effectiveEndpoint}`)

        if (!res.ok) {
          const body = await res.json()
          console.error(`MovieRow ${effectiveEndpoint} → HTTP ${res.status}:`, body)
          throw new Error(`${res.status}`)
        }

        const data = await res.json()
        const raw: MovieResult[] = Array.isArray(data) ? data : data?.results ?? []
        if (!cancelled) setMovies(raw)
      } catch (err) {
        if (!cancelled) console.error("MovieRow fetch error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [effectiveEndpoint])

  const hoveredMovie = hover ? movies[hover.index] : null

  const portalImage = hoveredMovie
    ? hoveredMovie.backdrop_path
      ? `${hoveredMovie.backdrop_path}`
      : hoveredMovie.poster_path
      ? `${hoveredMovie.poster_path}`
      : null
    : null

  const { runtimes, loading: runtimesLoading } = useRuntimes(
    movies.map(m => m.id)
  )
 
  if (loading) return <CarouselSkeleton title={title} />
  
  return (
    <>
      <Carousel title={title}>
        {movies.map((movie, index) => {
          const isHovered = hover?.index === index
          const src = movie.backdrop_path
            ? `${movie.backdrop_path}`
            : movie.poster_path
            ? `${movie.poster_path}`
            : null

          return (
            <motion.div
              key={movie.id}
              initial={false}
              variants={cardVariants}
              className="shrink-0 relative"
              style={{ zIndex: isHovered ? 50 : 1 }}
              onMouseEnter={(e) => handleMouseEnter(e, index)}
              onMouseLeave={handleMouseLeave}
              animate={
                hover && !isHovered
                  ? { filter: "brightness(0.8)" }
                  : { filter: "brightness(1)" }
              }
              transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
            >
              <div className="relative w-60 md:w-65 aspect-video rounded-md overflow-hidden cursor-pointer">
                {src ? (
                  <Image
                    src={movie.backdrop_path ? `${movie.backdrop_path}` : `${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    // Only eagerly load first row's images
                    priority={priority && index < 4}
                    sizes="(max-width: 768px) 240px, 260px"
                    className="object-cover"
                    unoptimized={!!src?.includes("archive.org")}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <span className="text-white/15 text-4xl">🎬</span>
                  </div>
                )}
                <div className="absolute top-0 right-1">
                  <AvailabilityBadge type={movie.availability} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </Carousel>

      {hoveredMovie && (
        <CarouselPortal
          hover={hover}
          image={portalImage}
          title={hoveredMovie.title}
          year={hoveredMovie.year}
          rating={hoveredMovie.rating}
          runtime={runtimes[hoveredMovie.id]}
          runtimeLoading={runtimesLoading}
          availability={hoveredMovie.availability}
          getPortalStyle={getPortalStyle}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          infoPanel={<RowInfoPanel movie={hoveredMovie} />}
        />
      )}
    </>
    )
}
