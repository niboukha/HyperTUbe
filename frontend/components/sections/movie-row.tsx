"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Play, Plus } from "lucide-react"

import Carousel from "@/components/carousel/carousel"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { useHoverPortal } from "@/components/carousel/use-hover-portal"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { mapToCards } from "@/lib/mock-data"
import { Movie, MovieCard } from "@/types/search"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"

type MovieRowProps = {
  title: string
  endpoint: string
}

export default function MovieRow({ title, endpoint }: MovieRowProps) {
  const [movies, setMovies] = useState<MovieCard[]>([])
  const [loading, setLoading] = useState(true)
  const {
    hover,
    handleMouseEnter,
    handleMouseLeave,
    clearHoverTimeout,
    getPortalStyle,
  } = useHoverPortal()

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error("Failed to fetch")

        const data = await res.json()

        const results: Movie[] = Array.isArray(data)
          ? data
          : data?.results ?? []

        const mapped = mapToCards(results)
        console.log("Fetched movies:", mapped)
        setMovies(mapped)
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

  const hoveredMovie = hover ? movies[hover.index] : null

  if (loading) return <CarouselSkeleton title={title} /> 

  return (
      <>
        <Carousel title={title}>
          {movies.map((movie, index) => {
            const isHovered = hover?.index === index
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
                <div className="relative w-70 md:w-75 aspect-video rounded-md overflow-hidden cursor-pointer">
                  <Image
                    src={movie.backdrop_path || "/placeholder.jpg"}
                    alt={movie.title || "movie"}
                    fill
                    priority
                    sizes="300px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-background/50 via-background/10 to-transparent" />
                </div>
              </motion.div>
            )
          })}
        </Carousel>

        {hoveredMovie && (
          <CarouselPortal
            hover={hover}
            image={hoveredMovie.backdrop_path || "/placeholder.jpg"}
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

