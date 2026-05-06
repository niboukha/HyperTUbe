"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Play, Plus } from "lucide-react"

import Carousel from "@/components/carousel/carousel"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { useHoverPortal } from "@/components/carousel/use-hover-portal"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { Movie, MovieCard } from "@/types/search"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"

type Props = {
  title: string
  endpoint: string
  priority?: boolean // only true for the first visible row
}

function mapToCards(results: Movie[]): MovieCard[] {
  return results.map((m) => ({
    id:            m.id,
    title:         m.title,
    overview:      m.overview ?? "",
    year:          m.release_date?.slice(0, 4) ?? "",
    rating:        m.vote_average ? Number(m.vote_average.toFixed(1)) : null,
    availability:  (m as any).availability ?? "premium",
    poster_path:   m.poster_path  ?? null,
    backdrop_path: m.backdrop_path ?? null,
    image:         m.backdrop_path ?? m.poster_path ?? null,
    poster:        m.poster_path ?? null,
  }))
}

export default function MovieRow({ title, endpoint, priority = false }: Props) {
  const [movies,  setMovies]  = useState<MovieCard[]>([])
  const [loading, setLoading] = useState(true)

  const { hover, handleMouseEnter, handleMouseLeave, clearHoverTimeout, getPortalStyle } =
    useHoverPortal()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res  = await fetch(endpoint)
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        const raw: Movie[] = Array.isArray(data) ? data : data?.results ?? []
        if (!cancelled) setMovies(mapToCards(raw))
      } catch (err) {
        console.error("MovieRow fetch error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [endpoint])

  const hoveredMovie = hover ? movies[hover.index] : null

  // Fix: image was being double-prefixed in original code
  const portalImage = hoveredMovie
    ? hoveredMovie.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${hoveredMovie.backdrop_path}`
      : hoveredMovie.poster_path
      ? `https://image.tmdb.org/t/p/w342${hoveredMovie.poster_path}`
      : null
    : null

  if (loading) return <CarouselSkeleton title={title} />

  return (
    <>
      <Carousel title={title}>
        {movies.map((movie, index) => {
          const isHovered = hover?.index === index
          // Pick best image — backdrop preferred for landscape cards
          const src = movie.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
            : movie.poster_path
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
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
                    src={src}
                    alt={movie.title}
                    fill
                    // Only eagerly load first row's images
                    priority={priority && index < 4}
                    sizes="(max-width: 768px) 240px, 260px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <span className="text-white/15 text-4xl">🎬</span>
                  </div>
                )}
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
          availability={hoveredMovie.availability}
          getPortalStyle={getPortalStyle}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          infoPanel={
            <div className="flex flex-col gap-1">
              <p className="text-text-primary/50 text-xs line-clamp-2">
                {hoveredMovie.overview}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TooltipButton
                  label="Watch now"
                  className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:bg-text-primary/80 transition"
                >
                  <Play className="h-4 w-4 text-background fill-background ml-0.5" />
                </TooltipButton>
                <TooltipButton
                  label="Add to watchlist"
                  className="w-8 h-8 rounded-full border border-text-primary/30 flex items-center justify-center hover:border-text-primary transition"
                >
                  <Plus className="h-4 w-4 text-text-primary" />
                </TooltipButton>
              </div>
            </div>
          }
        />
      )}
    </>
  )
}