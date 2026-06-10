import { MovieResult } from "@/types/search";
import Image from "next/image";
import { useHoverPortal } from "../carousel/use-hover-portal";

import { motion } from "framer-motion"
import { Play, Plus, Star } from "lucide-react"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { TooltipButton } from "../ui/tool-tip-button"
import { AvailabilityBadge } from "../ui/AvailabilityBadge";
import Link from "next/link";

type MovieCardProps = {
  index: number
  movie: MovieResult
  runtime?: string
  runtimeLoading?: boolean
}

export default function MovieCard({ index, movie, runtime, runtimeLoading }: MovieCardProps) {
  const {
    hover,
    handleMouseEnter,
    handleMouseLeave,
    clearHoverTimeout,
    getPortalStyle,
  } = useHoverPortal()

  const hoveredMovie = hover ? movie : null
  const isHovered = hover?.index === index

  const imagePath = movie.backdrop_path || movie.poster_path
  const image = imagePath
    ? `${imagePath}`
    : null

  const hoveredimagepath = hoveredMovie?.backdrop_path || hoveredMovie?.poster_path || null

  const hoveredimage = hoveredimagepath ? `${hoveredimagepath}`
    : null

  return (
    <>
      <motion.div
        key={movie.id}
        initial={false}
        variants={cardVariants}
        className="shrink-0 relative border border-transparent rounded-md overflow-hidden cursor-pointer"
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
        <div className="relative w-full aspect-16/10 overflow-hidden aspect-video">
          {image ? (
            <Image
              src={image}
              alt={movie.title}
              fill
              priority
              sizes="360px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/15 text-4xl">🎬</span>
            </div>
          )}
          <div className="absolute top-0.5! right-1!">
            <AvailabilityBadge type={movie.availability} />
          </div>
        </div> 
      </motion.div>

      { hoveredMovie && (
        <CarouselPortal
          hover={hover}
          image={ hoveredimage }
          title={hoveredMovie.title}
          year={hoveredMovie.year}
          rating={hoveredMovie.rating}
          runtime={runtime}
          runtimeLoading={runtimeLoading}
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
                  <Link href={`/movies/${movie.id}`}>
                    <Play className="h-4 w-4 text-background fill-background ml-0.5" />
                  </Link>
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
