import { AnimatePresence, motion } from "framer-motion"
import { containerVariants, itemVariants } from "@/lib/annimations/hero-variants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Plus, Flame } from "lucide-react"
import { Movie, MovieResult } from "@/types/search"
import { formatVotes, getReleaseYear, truncateOverview } from "@/lib/utils/movie"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres"
import { use, useEffect, useState } from "react"


type HeroContentProps = {
  movie: MovieResult
  activeSlide: number
}

export function getGenreNames(ids?: number[]) {
  if (!ids) return []
  return ids.map((id) => TMDB_GENRE_LABELS[id]).filter(Boolean)
}

export const getMovieDetails = async (id: number) => {
  const res = await fetch(`/api/movies/${id}`)
  return res.json()
}

export function HeroContent({ movie, activeSlide }: HeroContentProps) {
    const truncatedOverview = truncateOverview(movie.overview ?? "", 180)
    const [duration, setDuration] = useState<string>("")

    useEffect(() => {
        async function load() {
            const data = await getMovieDetails(movie.id)

            if (!data.runtime) {
                setDuration("N/A")
                return
            }

            const h = Math.floor(data.runtime / 60)
            const m = data.runtime % 60

            setDuration(`${h}h ${m}m`)
        }

        load()
    }, [movie.id])

    return (
        <AnimatePresence mode="sync">
            <motion.div
            key={`content-${movie.id}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 flex flex-col gap-3 justify-end pb-15! md:pb-50! px-5! md:px-13! lg:px-16!"
            >
                <motion.div variants={itemVariants} className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-accent-red" />
                    <span className="text-accent-red font-bold text-xs md:text-sm uppercase tracking-wider">
                    #{activeSlide + 1} in Movies Today
                    </span>
                </motion.div>

                {/* Title */}
                <motion.div variants={itemVariants} className=" drop-shadow-lg text-3xl md:text-5xl lg:text-7xl font-title  text-white tracking-wide max-w-4xl mb-2! text-balance uppercase">
                    {movie.title}
                </motion.div>
                
                {/* Badge Row */}
                <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2! md:gap-2! mb-2!">
                    <Badge variant="secondary" className="bg-accent-gold text-foreground border-0 text-sm font-bold! rounded-md p-1!">
                        TMDb
                    </Badge>
                    <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
                        {movie.rating}
                    </Badge>
                    <span className="text-text-muted/50 hidden md:inline">|</span>
                    <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                        {movie.year}
                    </Badge>
                    <span className="text-text-muted/50 hidden md:inline">|</span>
                    <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                        {duration}
                    </Badge>
                    <span className="text-text-muted/50 hidden md:inline">|</span>
                    {movie.genre?.map((id: number) => (
                        <Badge key={id} variant="link" className="text-text-muted text-xs rounded-md">
                            {TMDB_GENRE_LABELS[id]}
                        </Badge>
                    ))}
                </motion.div>

                {/* Description */}
                <motion.p variants={itemVariants} className="text-text-muted text-sm md:text-base max-w-140 mb-2! line-clamp-2">
                {truncatedOverview}
                </motion.p>

                {/* Action Buttons - shadcn/ui */}
                <motion.div variants={itemVariants} className="flex flex-row flex-wrap items-center gap-3 mb-8">
                    <Tooltip key="Watch Now">
                        <TooltipTrigger asChild>
                            <Button
                                size="lg"
                                className="bg-text-primary hover:bg-text-primary text-foreground font-semibold px-2! gap-2 rounded-md shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Watch Now
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p
                                className="whitespace-nowrap
                                text-sm font-medium text-background bg-white
                                px-2! py-2! rounded-lg border border-white/10
                                pointer-events-none z-50 shadow-lg"
                            >
                                Start watching {movie.title}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip key="Add to List">
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="border-white/30 bg-white/10 hover:bg-white/20 text-white h-9.5 w-9.5 rounded-md shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
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
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}