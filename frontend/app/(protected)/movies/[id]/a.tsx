"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Clapperboard, Plus, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MovieDetail } from "@/types/movie"
import ReviewsList from "@/components/VedioDetails/ReviewsList"
import FeedbackForm from "@/components/VedioDetails/FeedbackForm"
import HeaderTitle from "@/components/ui/header-title"
import Crow from "@/components/VedioDetails/Crow"
import { Review } from "@/types/Review"

const API = "http://localhost:8000"

// ── data fetching ─────────────────────────────────────────────────────────────
async function fetchMovieDetail(id: string): Promise<MovieDetail | null> {
  try {
    const res = await fetch(`${API}/movies/${id}/`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchTrailer(movie: MovieDetail): Promise<string | null> {
  // Only TMDB movies have trailers via TMDB API
  if (movie.source !== "tmdb" || !movie.tmdb_id) return null
  try {
    const res  = await fetch(`${API}/movies/${movie.id}/trailer/`)
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export default function MovieDetailPage() {
  const params   = useParams()
  const movieId  = params.id as string   // e.g. "tmdb-1266127"

  const [movie,       setMovie]       = useState<MovieDetail | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [trailerUrl,  setTrailerUrl]  = useState<string | null>(null)
  const [reviews,     setReviews]     = useState<Review[]>([])

  // fetch movie detail
  useEffect(() => {
    setLoading(true)
    fetchMovieDetail(movieId).then(data => {
      setMovie(data)
      setLoading(false)
    })
  }, [movieId])

  // fetch trailer only when dialog opens
  useEffect(() => {
    if (!trailerOpen || !movie) return
    fetchTrailer(movie).then(setTrailerUrl)
    return () => setTrailerUrl(null)
  }, [trailerOpen, movie])

  if (loading) return <DetailSkeleton />
  if (!movie)  return <NotFound />

  const isArchive   = movie.source === "archive"
  const watchUrl    = isArchive ? movie.watch_url : undefined
  const hasTrailer  = !isArchive
  const director    = isArchive ? movie.director : undefined

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${movie.backdrop_path ?? movie.poster_path})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/5" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="z-40 w-[min(85vw,500px)] md:w-[min(40vw,700px)] absolute top-[30%] md:top-[41%] left-4 md:left-16"
        >
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="font-[anton] text-white text-2xl lg:text-6xl uppercase leading-none tracking-wide"
          >
            {movie.title}
          </motion.h1>

          {/* Tagline */}
          {movie.tagline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/40 text-sm italic mt-1!"
            >
              {movie.tagline}
            </motion.p>
          )}

          {/* Meta badges */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-2! mt-2! mb-4!"
          >
            <AvailabilityBadge
              type={movie.availability}
              className="text-[10px] font-bold px-1.5! py-0.5!"
              badgeClassName="w-3 h-3"
            />

            {movie.rating > 0 && (
              <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
                <Star className="h-3 w-3 fill-yellow-400/70 text-yellow-400/70" />
                {movie.rating.toFixed(1)}
                <span className="text-text-muted/60">/10</span>
              </Badge>
            )}

            {movie.year && (
              <>
                <span className="text-text-muted/50 hidden md:inline">|</span>
                <Badge variant="link" className="text-text-muted text-xs rounded-md">
                  {movie.year}
                </Badge>
              </>
            )}

            {movie.runtime && (
              <>
                <span className="text-text-muted/50 hidden md:inline">|</span>
                <Badge variant="link" className="text-text-muted text-xs rounded-md">
                  {movie.runtime}
                </Badge>
              </>
            )}

            {/* genres — use full genre objects if available */}
            {movie.genres?.map(g => (
              <span key={g.id} className="flex items-center gap-2!">
                <span className="text-text-muted/50 hidden md:inline">|</span>
                <Badge variant="link" className="text-text-muted text-xs rounded-md">
                  {g.name}
                </Badge>
              </span>
            ))}

            {/* Archive: director */}
            {director && (
              <>
                <span className="text-text-muted/50 hidden md:inline">|</span>
                <Badge variant="link" className="text-text-muted text-xs rounded-md">
                  Dir. {director}
                </Badge>
              </>
            )}
          </motion.div>

          {/* Overview */}
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="text-text-muted text-sm! max-w-140 mb-2! line-clamp-4"
          >
            {movie.overview}
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="mt-4! md:mt-6! flex flex-row gap-2"
          >
            {/* Watch Now */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {isArchive ? (
                // Archive: open in new tab
                <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="h-12 w-35 bg-text-primary hover:bg-text-primary text-foreground font-semibold gap-2 rounded-md">
                    <Play className="w-5 h-5 fill-current" />
                    Watch Free
                  </Button>
                </a>
              ) : (
                // TMDB/premium: your internal player
                <Button className="h-12 w-35 bg-text-primary hover:bg-text-primary text-foreground font-semibold gap-2 rounded-md">
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </Button>
              )}
            </motion.div>

            {/* Trailer — only for TMDB */}
            {hasTrailer && (
              <motion.div
                className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTrailerOpen(true)}
              >
                <Clapperboard className="h-8 w-8 text-white" />
              </motion.div>
            )}

            {/* Watchlist */}
            <motion.div
              className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          {/* Studios / production info */}
          {movie.studios?.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-white/20 text-xs mt-4!"
            >
              {movie.studios.join(" · ")}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* ── Collection row ───────────────────────────────────────────── */}
      {movie.collection && (
        <div className="px-4! md:px-16! py-4!">
          <HeaderTitle title={movie.collection.name} />
          {/* plug in your PrimeRow component here */}
          {/* <PrimeRow endpoint={`/api/movies/?type=collection/${movie.collection.id}`} /> */}
        </div>
      )}

      {/* ── Trailer dialog ───────────────────────────────────────────── */}
      <Dialog
        open={trailerOpen}
        onOpenChange={(val) => {
          setTrailerOpen(val)
          if (!val) setTrailerUrl(null)
        }}
      >
        <DialogTitle className="sr-only">Trailer</DialogTitle>
        <DialogContent
          style={{ maxWidth: "min(90vw, 900px)", width: "min(90vw, 900px)" }}
          className="p-0 bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="w-full aspect-video bg-black">
            {trailerUrl ? (
              <iframe
                className="w-full h-full"
                src={trailerUrl}
                title="Movie Trailer"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white"
                />
              </div>
            )}
          </div>
          <div className="pb-2" />
        </DialogContent>
      </Dialog>

      {/* ── Reviews ──────────────────────────────────────────────────── */}
      <div className="px-4! md:px-16! py-2! flex flex-col gap-13">
        <div className="space-y-2!">
          <HeaderTitle title="Reviews" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4!">
            <div className="lg:col-span-4">
              <FeedbackForm onSubmit={() => {}} />
            </div>
            <div className="lg:col-span-8">
              <ReviewsList reviews={reviews} onLike={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── small helpers ─────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="h-screen bg-white/5 animate-pulse" />
  )
}

function NotFound() {
  return (
    <div className="h-screen flex items-center justify-center text-white/40">
      Movie not found.
    </div>
  )
}








