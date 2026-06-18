"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { MovieImage } from "@/components/ui/movie-image"
import { Play, Plus } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { useHoverPortal } from "@/components/carousel/use-hover-portal"
import Carousel from "../carousel/carousel"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"
import { useTranslations } from "next-intl"
import { useContinueWatching } from "@/hooks/use-continue-watching"

export default function ContinueWatching() {
  const t = useTranslations("Sections")
  const tCommon = useTranslations("Common")
  const title = t("continueWatching")
  const router = useRouter()

  const { items, loading } = useContinueWatching()
  const { hover, clearHoverTimeout, handleMouseEnter, handleMouseLeave, getPortalStyle } = useHoverPortal()

  if (loading) return <CarouselSkeleton title={title} />
  if (items.length === 0) return null

  const hoveredMovie = hover !== null ? items[hover.index] : null

  return (
    <>
      <Carousel title={title}>
        {items.map((movie, index) => {
          const isHovered = hover?.index === index
          const imagePath = movie.backdrop_path ?? movie.poster_path ?? null

          return (
            <motion.div
              key={movie.id}
              initial={false}
              variants={cardVariants}
              className="shrink-0 relative"
              style={{ zIndex: isHovered ? 50 : 1 }}
              onMouseEnter={(e) => handleMouseEnter(e, index)}
              onMouseLeave={handleMouseLeave}
              onClick={() => router.push(`/watch/${movie.id}`)}
              animate={
                hover && !isHovered
                  ? { filter: "brightness(0.8)" }
                  : { scale: 1, filter: "brightness(1)" }
              }
              transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
            >
              <div className="relative w-60 md:w-65 aspect-video rounded-md overflow-hidden cursor-pointer">
                {imagePath ? (
                  <MovieImage
                    src={imagePath}
                    alt={movie.title}
                    fill
                    sizes="360px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-background">
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
          image={hoveredMovie.backdrop_path ?? hoveredMovie.poster_path ?? null}
          title={hoveredMovie.title}
          year={hoveredMovie.release_date?.slice(0, 4) ?? undefined}
          rating={hoveredMovie.vote_average ?? undefined}
          availability="free"
          getPortalStyle={getPortalStyle}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          progress={hoveredMovie.progress}
          infoPanel={
            <div className="flex flex-col gap-1">
              {hoveredMovie.runtimeLeft && (
                <div className="flex items-center gap-2 text-text-primary/50 text-xs">
                  <span>{hoveredMovie.runtimeLeft} {tCommon("left")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <TooltipButton
                  className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:bg-text-primary/80 transition"
                  label={tCommon("play")}
                  onClick={() => router.push(`/watch/${hoveredMovie.id}`)}
                >
                  <Play className="h-4 w-4 text-background fill-background ml-0.5" />
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
