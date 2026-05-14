import { AnimatePresence, motion } from "framer-motion"
import { containerVariants, itemVariants } from "@/lib/annimations/hero-variants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Plus, Flame, Star } from "lucide-react"
import { MovieResult } from "@/types/search"
import { truncateOverview } from "@/lib/utils/movie"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres"
import { AvailabilityBadge } from "../ui/AvailabilityBadge"
import { useMovieDetails } from "@/hooks/use-movie-details"
import Link from "next/link"

type HeroContentProps = {
  movie: MovieResult
  activeSlide: number
}

export function getGenreNames(ids?: number[]) {
  if (!ids) return []
  return ids.map((id) => TMDB_GENRE_LABELS[id]).filter(Boolean)
}

export function HeroContent({ movie, activeSlide }: HeroContentProps) {
    const truncatedOverview = truncateOverview(movie.overview ?? "", 180)
    const { data, loading } = useMovieDetails(movie.id)
    const duration = data?.runtime

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

                {/* Title */}
                <div className="">

                    <motion.div variants={itemVariants} className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-accent-red" />
                        <span className="text-accent-red font-bold text-xs md:text-sm uppercase tracking-wide">
                        #{activeSlide + 1} in Movies Today
                        </span>
                    </motion.div>

                    <motion.div variants={itemVariants} className=" drop-shadow-lg text-3xl md:text-5xl lg:text-6xl font-title text-white tracking-wide max-w-3xl! text-balance uppercase">
                        {movie.title}
                    </motion.div>
                    
                </div>

                <div className="space-y-1!">
                    {/* Badge Row */}
                    <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-1!">
                        {/* <Badge variant="secondary" className="bg-accent-gold text-foreground border-0 text-sm font-bold! rounded-md p-1!">
                            TMDb
                        </Badge> */}
                        
                        <AvailabilityBadge type={movie.availability} className="text-[10px] font-bold px-1.5! py-0.5!" badgeClassName="w-3 h-3" />
                        <Badge variant="link" className=" text-text-muted text-xs gap-0 rounded-md">
                            {movie.rating}
                            <span className="text-text-muted/60">/10</span>
                            {/* <Star className="h-3 w-3 text-[#eab308] fill-[#eab308]" /> */}
                        </Badge>
                        <span className="text-text-muted/50 hidden md:inline">|</span>
                        <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                            {movie.year}
                        </Badge>
                        <span className="text-text-muted/50 hidden md:inline">|</span>
                        <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                            {
                                loading ? (
                                    <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
                                ) : (
                                    <span>{duration}</span>
                                )
                            }
                        </Badge>
                        {/* <span className="text-text-muted/50 hidden md:inline">|</span>
                        {movie.genre?.map((id: number) => (
                            <Badge key={id} variant="link" className="text-text-muted text-xs rounded-md">
                                {TMDB_GENRE_LABELS[id]}
                            </Badge>
                        ))} */}
                    </motion.div>
                    {/* Description */}
                    <motion.p variants={itemVariants} className="text-text-muted text-sm md:text-base max-w-140 mb-2! line-clamp-2">
                    {truncatedOverview}
                    </motion.p>
                </div>

                {/* Action Buttons - shadcn/ui */}
                <motion.div variants={itemVariants} className="flex flex-row flex-wrap items-center gap-3 mb-8">
                    <Tooltip key="Watch Now">
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
                            <motion.div
                                whileHover={{ rotate: 90 }}
                                transition={{ duration: 0.2 }}
                                className="h-10 w-10 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
                            >
                                <Plus className="h-8 w-8" color="#ffffff" />
                            </motion.div>
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