"use client"

import { AnimatePresence, motion } from "framer-motion"
import { containerVariants, itemVariants } from "@/lib/annimations/hero-variants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Plus, Check, Flame, Star } from "lucide-react"
import { MovieResult } from "@/types/search"
import { useWatchlistToggle } from "@/hooks/use-watchlist-toggle"
import { truncateOverview } from "@/lib/utils/movie"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres"
import { AvailabilityBadge } from "../ui/AvailabilityBadge"
import Link from "next/link"

type HeroContentProps = {
  movie:          MovieResult
  activeSlide:    number
  runtime?:       string        
  runtimeLoading?: boolean

}

export function getGenreNames(ids?: number[]) {
  if (!ids) return []
  return ids.map((id) => TMDB_GENRE_LABELS[id]).filter(Boolean)
}

export function HeroContent({ movie, activeSlide, runtime, runtimeLoading }: HeroContentProps) {
  const truncatedOverview = truncateOverview(movie.overview ?? "", 180)
  const { inWatchlist, toggle, loading } = useWatchlistToggle(movie)

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={`content-${movie.id}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 flex flex-col gap-4! justify-end pb-15! md:pb-55! px-5! md:px-13! lg:px-16!"
      >
        <div>
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent-red" />
            <span className="text-accent-red font-bold text-xs md:text-sm uppercase tracking-wide">
              #{activeSlide + 1} in Movies Today
            </span>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="drop-shadow-lg text-3xl md:text-5xl lg:text-6xl font-title text-white tracking-wide max-w-3xl! text-balance uppercase"
          >
            {movie.title}
          </motion.div>
        </div>

        <div className="space-y-1!">
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-1!">
            <AvailabilityBadge
              type={movie.availability}
              className="text-[10px] font-bold px-1.5! py-0.5!"
              badgeClassName="w-3 h-3"
            />
            <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
              <Star className="h-3 w-3 fill-yellow-400/70 text-yellow-400/70" />
              {movie.rating?.toFixed(1) ?? "0.0"}
            </Badge>
            <span className="text-text-muted/50 hidden md:inline">|</span>
            <Badge variant="link" className="text-text-muted text-xs rounded-md">
              {movie.year}
            </Badge>
            <span className="text-text-muted/50 hidden md:inline">|</span>

            <Badge variant="link" className="text-text-muted text-xs rounded-md">
              {runtimeLoading || !runtime ? (
                <div className="h-3 w-10 rounded bg-white/10 animate-pulse" />
              ) : (
                runtime
              )}
            </Badge>
            {/* Runtime removed — not available in list payload, shown on detail page */}
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-text-muted text-sm md:text-base max-w-140 mb-2! line-clamp-3"
          >
            {truncatedOverview}
          </motion.p>
        </div>

        <motion.div
          variants={itemVariants}
          className="flex flex-row flex-wrap items-center gap-3 mb-8"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/movies/${movie.id}`}>
                <Button
                  size="lg"
                  className="bg-text-primary hover:bg-text-primary text-foreground font-semibold px-2! gap-2 rounded-md shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-nowrap text-sm font-medium text-background bg-white px-2! py-2! rounded-lg border border-white/10 pointer-events-none z-50 shadow-lg">
                Start watching {movie.title}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ rotate: inWatchlist ? 0 : 90 }}
                transition={{ duration: 0.2 }}
                onClick={toggle}
                className={`h-10 w-10 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer transition-colors ${
                  inWatchlist ? "bg-white/30" : "bg-[#FFFFFF]/14"
                } ${loading ? "opacity-60 pointer-events-none" : ""}`}
              >
                {inWatchlist
                  ? <Check className="h-6 w-6 text-white" />
                  : <Plus className="h-8 w-8 text-white" />
                }
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-nowrap text-sm font-medium text-background bg-white px-2! py-2! rounded-lg border border-white/10 pointer-events-none z-50 shadow-lg">
                {inWatchlist ? `Remove ${movie.title} from your list` : `Add ${movie.title} to your list`}
              </p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}