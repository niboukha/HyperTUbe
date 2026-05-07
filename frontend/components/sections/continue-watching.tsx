"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Play, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { mapTrendingToContinueWatching } from "@/lib/mock-data"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { useHoverPortal } from "@/components/carousel/use-hover-portal"
import Carousel from "../carousel/carousel"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"
import { getMovieDetails } from "../hero/hero-content"
import { Movie, MovieResult } from "@/types/search"

type ContinueWatchingMovie = {
  id: number
  title: string
  progress: number
  poster_path?: string | null
  backdrop_path?: string | null
  duration?: string
  remainingTime?: string
  year?: string
  rating?: number
  availability: "free" | "premium"
}

export default function ContinueWatching( { title = "Continue Watching" }: { title?: string }) {
  const [movies, setMovies] = useState<ContinueWatchingMovie[]>([])
  const [loading, setLoading] = useState(true)
  const { hover, clearHoverTimeout, handleMouseEnter, handleMouseLeave, getPortalStyle } = useHoverPortal()

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/movies?type=trending")
        const data = await res.json()
        const results: Movie[] = Array.isArray(data) ? data : data?.results ?? []
        // console.log("Fetched movies for Continue Watching:", results)
        setMovies(mapTrendingToContinueWatching(results))
      } catch {
        setMovies([])
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  const hoveredMovie = hover !== null ? movies[hover.index] : null
  const hoveredimagepath = hoveredMovie?.backdrop_path || hoveredMovie?.poster_path || null
  const [duration, setDuration] = useState<string>("")

  useEffect(() => {
    if (hover === null) return

    const movie = movies[hover.index]
    if (!movie) return

    const id = movie.id

    async function load() {
      const data = await getMovieDetails(id)

      if (!data.runtime) {
        setDuration("N/A")
        return
      }

      const h = Math.floor(data.runtime / 60)
      const m = data.runtime % 60

      setDuration(`${h}h ${m}m`)
    }

    load()
  }, [hover, movies])

  if (loading) return <CarouselSkeleton title={title} />
  
  return (
    <>
      <Carousel title={title}>
        {movies.map((movie, index) => {
          const isHovered = hover?.index === index
          const imagePath = movie.backdrop_path ?? movie.poster_path ?? null

          const image = imagePath
            ? `https://image.tmdb.org/t/p/w780${imagePath}`
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
                  : { scale: 1, filter: "brightness(1)" }
              }
              transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
            >
              <div
                className="relative w-60 md:w-65 aspect-video rounded-md overflow-hidden cursor-pointer"
              >
                {image ? (
                  <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="360px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-background object-cover transition-transform duration-500 group-hover:scale-105">
                    <span className="text-white/15 text-4xl">🎬</span>
                  </div>
                )}
                            
                <div className="absolute inset-0 bg-linear-to-t from-background/50 via-background/10 to-transparent" />
                
                <div className="absolute bottom-0! left-0! right-0! mx-2! pb-2!">
                  <Progress value={movie.progress} className="h-0.75! bg-text-primary/20" />
                  <div className="absolute top-0! left-0! h-0.75! bg-accent-red rounded-full" style={{ width: `${movie.progress}%` }} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </Carousel>

      {hoveredMovie && (
        <CarouselPortal
          hover={hover}
          image={ hoveredimagepath ? `https://image.tmdb.org/t/p/w342${hoveredimagepath}` : null }
          title={hoveredMovie.title}
          year={hoveredMovie.year}
          rating={hoveredMovie.rating}
          duration={duration}
          availability={hoveredMovie.availability}
          getPortalStyle={getPortalStyle}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          progress={hoveredMovie.progress}
          infoPanel={
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-text-primary/50 text-xs">
                <span>{hoveredMovie.remainingTime} left</span>
                {/* <span>•</span>
                <span>{duration}</span> */}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TooltipButton
                  className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:bg-text-primary/80 transition"
                  label="Play"
                >
                  <Play className="h-4 w-4 text-background fill-background ml-0.5" />
                </TooltipButton>
                <TooltipButton
                  className="w-8 h-8 rounded-full border border-text-primary/30 flex items-center justify-center hover:border-text-primary transition"
                  label="Add to List"
                >
                  <Plus className="h-4 w-4 text-text-primary" />
                </TooltipButton>
                
                <TooltipButton
                  className="ml-auto w-8 h-8 rounded-full border border-text-primary/30 flex items-center justify-center hover:border-text-primary text-text-muted transition bg-transparent text-[10px]!"
                  label={`${hoveredMovie.progress}% watched`}
                >
                  {hoveredMovie.progress}%
                </TooltipButton>
              </div>
            </div>
          }
        />
      )}
    </>
  )
}