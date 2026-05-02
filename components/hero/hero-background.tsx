"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "../ui/card"
import { Skeleton } from "../ui/skeleton"
import HeroImage from "./hero-image"
import { HeroContent } from "./hero-content"
import HeroDots from "./hero-dots"

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

const AUTOPLAY_DURATION = 10000

export function HeroBackground() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const heroRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isOutOfViewRef = useRef(false)
  const moviesLengthRef = useRef(0)

  const syncPauseRef = () => {
    isPausedRef.current = isHoveredRef.current || isOutOfViewRef.current
  }

  useEffect(() => { moviesLengthRef.current = movies.length }, [movies.length])

  // IntersectionObserver — writes directly to ref, no state
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isOutOfViewRef.current = !entry.isIntersecting
        syncPauseRef()
      },
      { threshold: 0.1 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

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

  useEffect(() => {
    if (movies.length === 0) return

    const TICK = 100
    const increment = 100 / (AUTOPLAY_DURATION / TICK)

    const interval = setInterval(() => {
      if (isPausedRef.current) return

      setProgress((prev) => {
        if (prev + increment >= 100) {
          setActiveSlide((current) => (current + 1) % moviesLengthRef.current)
          return 0
        }
        return prev + increment
      })
    }, TICK)

    return () => clearInterval(interval)
  }, [movies.length])

  const handleSlideChange = useCallback((index: number) => {
    setActiveSlide(index)
    setProgress(0)
  }, [])

  if (isLoading) {
    return (
      <Card className="h-screen bg-background border-0 rounded-none flex items-center justify-center">
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
      <Card className="h-screen bg-linear-to-br from-background to-background border-0 rounded-none" />
    )
  }

  return (
    <div ref={heroRef}>
      <Card
        className="relative h-screen overflow-hidden bg-background border-0 rounded-none"
        onMouseEnter={() => {
          isHoveredRef.current = true
          syncPauseRef()
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false
          syncPauseRef()
        }}
      >
        <HeroImage movie={currentMovie} />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/30" />
        <HeroContent movie={currentMovie} activeSlide={activeSlide} />
        <HeroDots
          movies={movies}
          activeSlide={activeSlide}
          handleSlideChange={handleSlideChange}
          progress={progress}
        />
      </Card>
    </div>
  )
}