"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Play, Plus, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"
import { backgroundVariants, containerVariants, itemVariants } from "@/lib/annimations/hero-variants"

interface Movie {
  id: number
  title: string
  overview: string
  backdrop_path: string | null
  poster_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  runtime?: number
  genres?: { id: number; name: string }[]
}


export function HeroBackground() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  const AUTOPLAY_DURATION = 8000 // 8 seconds

    useEffect(() => {
    const fetchMovies = async () => {
        try {
        const res = await fetch("/api/movies/trending")
        if (!res.ok) throw new Error("Failed to fetch TMDB movies")
        const data = await res.json()
        setMovies(data.slice(0, 10))
        } catch (err) {
        console.error("Failed to fetch movies:", err)
        setMovies([])
        } finally {
        setIsLoading(false)
        }
    }

    fetchMovies()
    }, [])

  // Autoplay with progress
  useEffect(() => {
    if (isPaused || movies.length === 0) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((current) => (current + 1) % movies.length)
          return 0
        }
        return prev + (100 / (AUTOPLAY_DURATION / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, movies.length])

  // Reset progress when slide changes manually
  const handleSlideChange = useCallback((index: number) => {
    setActiveSlide(index)
    setProgress(0)
  }, [])

  if (isLoading) {
    return (
      <Card className="h-screen bg-[#0f0f0f] border-0 rounded-none flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full bg-[#1a1a1a]" />
          <Skeleton className="w-32 h-4 bg-[#1a1a1a]" />
        </div>
      </Card>
    )
  }

  const currentMovie = movies[activeSlide]

  if (!currentMovie) {
    return (
      <Card className="h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-0 rounded-none" />
    )
  }

  // Format vote count
  const formatVotes = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  // Get year from release date
  const releaseYear = currentMovie.release_date
    ? new Date(currentMovie.release_date).getFullYear()
    : "N/A"

  // Truncate description
  const truncatedOverview =
    currentMovie.overview.length > 180
      ? currentMovie.overview.substring(0, 180) + "..."
      : currentMovie.overview

  return (
    <Card
      className="relative h-screen overflow-hidden bg-[#0f0f0f] border-0 rounded-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image with Zoom Animation */}
      <AnimatePresence mode="wait">
        {currentMovie.backdrop_path && (
          <motion.div
            key={currentMovie.id}
            variants={backgroundVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0"
          >
            <Image
              src={currentMovie.backdrop_path}
              alt={currentMovie.title}
              fill
              className="object-cover"
              priority
              quality={90}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Overlays - Netflix Style */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-[#0f0f0f]/30" />

      {/* Content with Staggered Animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute inset-0 flex flex-col justify-end pb-24 md:pb-32 px-6 md:px-12 lg:px-16"
        >
          {/* Rank Label */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/10">
              <Flame className="w-4 h-4 text-[#e50914]" />
              <span className="text-[#e50914] font-bold text-xs md:text-sm uppercase tracking-wider">
                #{activeSlide + 1} in Movies Today
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight max-w-4xl mb-4 text-balance"
          >
            {currentMovie.title}
          </motion.h1>

          {/* Badge Row */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
            <Badge variant="secondary" className="bg-[#1a1a1a]/80 text-white/90 border-0 text-xs rounded-md backdrop-blur-sm">
              TMDb
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/90 text-xs gap-1 rounded-md bg-black/20 backdrop-blur-sm">
              <svg className="w-3 h-3 fill-[#f5c518]" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              {currentMovie.vote_average.toFixed(1)}
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs rounded-md bg-black/20 backdrop-blur-sm">
              ({formatVotes(currentMovie.vote_count || 0)})
            </Badge>
            <span className="text-white/40 hidden md:inline">|</span>
            <Badge variant="outline" className="border-white/20 text-white/70 text-xs rounded-md bg-black/20 backdrop-blur-sm">
              {releaseYear}
            </Badge>
            <span className="text-white/40 hidden md:inline">|</span>
            <Badge variant="outline" className="border-white/20 text-white/70 text-xs rounded-md bg-black/20 backdrop-blur-sm">
              2h 15m
            </Badge>
            <span className="text-white/40 hidden md:inline">|</span>
            <Badge variant="outline" className="border-white/20 text-white/70 text-xs rounded-md bg-black/20 backdrop-blur-sm">
              Action
            </Badge>
          </motion.div>

          {/* Description with Glassmorphism */}
          <motion.div variants={itemVariants}>
            <p className="text-white/80 text-sm md:text-base max-w-[560px] mb-6 line-clamp-3 leading-relaxed">
              {truncatedOverview}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
            <Button
              size="lg"
              className="bg-[#e50914] hover:bg-[#b8070f] text-white font-semibold px-8 gap-2 rounded-md shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 hover:bg-white/20 text-white px-6 gap-2 rounded-md shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            >
              <Plus className="w-5 h-5" />
              My List
            </Button>
          </motion.div>

          {/* Progress Indicator & Carousel Dots */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            {/* Dots Navigation */}
            <div className="flex items-center gap-2">
              {movies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleSlideChange(index)}
                  className={`relative h-1.5 rounded-full transition-all duration-300 overflow-hidden ${
                    index === activeSlide ? "w-8 bg-white/20" : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to movie ${index + 1}`}
                >
                  {index === activeSlide && (
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-white rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Current / Total */}
            <div className="text-white/50 text-xs font-medium tabular-nums">
              {String(activeSlide + 1).padStart(2, "0")} / {String(movies.length).padStart(2, "0")}
            </div>

            {/* Pause Indicator */}
            {isPaused && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-white/40 text-xs"
              >
                Paused
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Card>
  )
}




import type { Variants } from "framer-motion"

// container: slower stagger + smoother feel
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18, // ⬆ slower stagger
      delayChildren: 0.35,   // ⬆ delayed entrance
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.08,
      staggerDirection: -1,
    },
  },
}

// items: slower, softer motion
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 }, // more movement = smoother feel
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,              // ⬆ slower
      ease: [0.25, 0.46, 0.45, 0.94], // smooth "easeOutExpo-like"
    },
  },
  exit: {
    opacity: 0,
    y: -15,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
}

// background: cinematic slow zoom
export const backgroundVariants: Variants = {
  initial: { scale: 1.12, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      scale: {
        duration: 12, // ⬆ MUCH slower zoom (cinematic feel)
        ease: "linear",
      },
      opacity: {
        duration: 1.2,
        ease: "easeOut",
      },
    },
  },
  exit: {
    scale: 1.05,
    opacity: 0,
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
}