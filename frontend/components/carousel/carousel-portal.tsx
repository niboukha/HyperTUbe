"use client"

import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Clock, Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { HoverState } from "./use-hover-portal"
import { AvailabilityBadge } from "../ui/AvailabilityBadge"
import { useMovieDetails } from "@/hooks/use-movie-details"
import { LoadingNumbers } from "../ui/loading-numbers"

type Props = {
  hover: HoverState
  image: string | null
  title: string
  year?: string | null
  rating?: number | null
  availability?: "free" | "premium"
  progress?: number
  getPortalStyle: (rect: DOMRect, origin: "left" | "center" | "right") => React.CSSProperties
  onMouseEnter: () => void
  onMouseLeave: () => void
  infoPanel: React.ReactNode
  movieId: string
}

export default function CarouselPortal({
  hover,
  movieId,
  image,
  title,
  year,
  rating,
  availability,
  progress,
  getPortalStyle,
  onMouseEnter,
  onMouseLeave,
  infoPanel,
}: Props) {
  const portalRoot = typeof window !== "undefined" ? document.getElementById("hover-root") : null
  if (!portalRoot || !hover) return null

  // const genres = [
  //   { id: "all", label: "All" },
  //   { id: "28", label: "Action" },
  //   { id: "35", label: "Comedy" },
  //   { id: "18", label: "Drama" }
  // ] // Add genres if you have them in the API, and display them like Prime Video with small pills

  const { data, loading } = useMovieDetails(movieId)
  const duration = data?.runtime

  return createPortal(
    <AnimatePresence>
      {hover && (
        <motion.div
          key={hover.index}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1.22, opacity: 1 }}
          exit={{ scale: 1, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, mass: 1.5 }}
          style={getPortalStyle(hover.rect, hover.origin)}
          className="cursor-pointer"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {/* Image */}
          <div className="relative w-full aspect-video rounded-t-[6px] overflow-hidden">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                priority
                sizes="360px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background object-cover transition-transform duration-500 group-hover:scale-105">
                <span className="text-white/15 text-4xl">🎬</span>
              </div>
            )}
            
            {/* <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" /> */}

            {/* Availability badge — top left like Prime */}
            {availability && (
              <div className="absolute top-1 right-2">
                <AvailabilityBadge type={availability} />
              </div>
            )}

            {/* Progress bar */}
            {progress !== undefined && (
              <div className="absolute bottom-0! left-0! right-0! mx-2! pb-2!">
                <Progress value={progress} className="h-0.75 bg-text-primary/20" />
                <div
                  className="absolute top-0 left-0 h-0.75 bg-accent-red rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <motion.div
              className="absolute inset-0 rounded-t-[6px] pointer-events-none"
              animate={{
                boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 30px 60px -8px rgba(0,0,0,0.9), 0 0 40px 4px rgba(189,4,4,0.15)",
              }}
            />
          </div>

          {/* Info panel */}
          <div className="bg-[#1a1a1a] rounded-b-[6px] shadow-2xl px-3! py-2! flex flex-col gap-1.5">

            {/* Title */}
            <p className="text-text-primary font-title text-md  text-balance tracking-wide">{title}</p>

            {/* Meta row — rating + year like Prime Video */}
            <div className="flex items-center gap-2">
              {rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#eab308] fill-[#eab308]" />
                  <span className="text-[#eab308] text-xs font-semibold">{rating}</span>
                </div>
              )}
              {rating && year && (
                <span className="text-text-primary/30 text-xs">•</span>
              )}
              {year && (
                <span className="text-text-primary/50 text-xs">{year}</span>
              )}
              {/* {runtime && ( add it later if we have it in the API, formatting it like Prime Video with a clock icon and "1h 45m" style runtime*/} 
                <div className="flex items-center gap-1 text-text-primary/40">
                  <span className="text-text-primary/20 text-xs">•</span>
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {
                        loading ? (
                            <LoadingNumbers />
                        ) : (
                            <span>{duration}</span>
                        )
                    }
                  </span>
                </div>
              {/* )} */}
            </div>
            {/* Custom slot per card type */}
            {infoPanel}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalRoot
  )
}
