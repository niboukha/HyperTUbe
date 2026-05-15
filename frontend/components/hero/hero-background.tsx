"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Card } from "../ui/card"
import { Skeleton } from "../ui/skeleton"
import HeroImage from "./hero-image"
import { HeroContent } from "./hero-content"
import HeroDots from "./hero-dots"
import { MovieResult } from "@/types/search"
import { useRuntimes } from "@/hooks/use-runtimes"

const AUTOPLAY_DURATION = 10000
const TICK = 100

type HeroBackgroundProps = { movies: MovieResult[] }

export default function HeroBackground({ movies }: HeroBackgroundProps) {
  const isLoading = !movies || movies.length === 0

  const [activeSlide, setActiveSlide] = useState(0)
  const [progress,    setProgress]    = useState(0)

  const heroRef      = useRef<HTMLDivElement>(null)
  const elapsedRef   = useRef(0)

  const isHoveredRef   = useRef(false)
  const isHiddenRef    = useRef(false)
  const isOffPageRef   = useRef(false)

  const pathname = usePathname()
  const { runtimes, loading: runtimesLoading } = useRuntimes(movies.map(m => m.id))

  const isPaused = () =>
    isHoveredRef.current || isHiddenRef.current || isOffPageRef.current

  // Track page navigation
  useEffect(() => {
    isOffPageRef.current = pathname !== "/home"
    console.log("[hero] pathname:", pathname, "isOffPage:", isOffPageRef.current)
  }, [pathname])

  // Track visibility — only pause when HIDDEN, not on initial fire
  useEffect(() => {
    if (!heroRef.current) return

    // Use a small negative threshold to avoid false "hidden" on mount
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only mark hidden when completely out of view
        isHiddenRef.current = !entry.isIntersecting
        console.log("[hero] intersection:", entry.isIntersecting, "paused:", isPaused())
      },
      { threshold: 0 }   // fires when element enters/leaves viewport at all
    )

    observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  // Autoplay — single effect, reads refs directly
  useEffect(() => {
    if (movies.length === 0) return

    console.log("[hero] starting interval, movies:", movies.length)

    const interval = setInterval(() => {
      if (isPaused()) {
        // Uncomment to debug why it's paused:
        // console.log("[hero] paused —", {
        //   hovered: isHoveredRef.current,
        //   hidden:  isHiddenRef.current,
        //   offPage: isOffPageRef.current,
        // })
        return
      }

      elapsedRef.current += TICK
      setProgress(Math.min((elapsedRef.current / AUTOPLAY_DURATION) * 100, 100))

      if (elapsedRef.current >= AUTOPLAY_DURATION) {
        elapsedRef.current = 0
        setActiveSlide(c => {
          const next = (c + 1) % movies.length
          console.log("[hero] slide →", next)
          return next
        })
      }
    }, TICK)

    return () => {
      console.log("[hero] clearing interval")
      clearInterval(interval)
    }
  }, [movies.length])

  const handleSlideChange = useCallback((index: number) => {
    setActiveSlide(index)
    setProgress(0)
    elapsedRef.current = 0
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
  if (!currentMovie) return (
    <Card className="h-screen bg-background border-0 rounded-none" />
  )

  return (
    <div ref={heroRef}>
      <Card
        className="relative h-screen overflow-hidden bg-background border-0 rounded-none"
        onMouseEnter={() => {
          isHoveredRef.current = true
          console.log("[hero] mouse enter — paused")
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false
          console.log("[hero] mouse leave — resumed")
        }}
      >
        <HeroImage movie={currentMovie} />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/30" />
        <HeroContent
          movie={currentMovie}
          activeSlide={activeSlide}
          runtime={runtimes[currentMovie.id]}
          runtimeLoading={runtimesLoading}
        />
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