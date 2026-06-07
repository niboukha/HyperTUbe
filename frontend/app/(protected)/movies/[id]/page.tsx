

'use client';

import { Badge } from "@/components/ui/badge";
import Crow from "@/components/VedioDetails/Crow";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clapperboard,Play,Plus, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ReviewsList from "@/components/VedioDetails/ReviewsList";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import FeedbackForm from "@/components/VedioDetails/FeedbackForm";
import { Review } from "@/types/Review";
import HeaderTitle from "@/components/ui/header-title";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { MovieDetail } from "@/types/movie";
import { useParams } from "next/navigation"
import Link from "next/link";
import PrimeRow from "@/components/sections/prime-row";
import { useCollection } from "@/hooks/use-collection";
import { useMovieDetail } from "@/hooks/use-movie-details";
import Overview from "@/components/ui/Overview";

export function stripHtml(html: string) {
  return html
    ?.replace(/<br\s*\/?>/gi, "\n")
    ?.replace(/<[^>]*>/g, "")
    ?.trim();
}

async function fetchTrailer(movie: MovieDetail): Promise<string | null> {
  // Only TMDB movies have trailers via TMDB API
  if (movie.source !== "tmdb" || !movie.tmdb_id) return null
  try {
    const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/${movie.id}/trailer/`)
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}

export default function VedioDetails()
{
  const [trailerOpen, setTrailerOpen] = useState<boolean>(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  
  const params   = useParams()
  const movieId  = params.id as string   // e.g. "tmdb-1266127"
  
  const [loading,     setLoading]     = useState(true)
  const [trailerUrl,  setTrailerUrl]  = useState<string | null>(null)
  const [reviews,     setReviews]     = useState<Review[]>([])
  const [currentUserId, setCurrentUserId] = useState<Number | null>(null)
  
  const { data: movie, pending, error, notFound } = useMovieDetail(movieId)
  const { data: collection } = useCollection(movie?.collection?.id)

  // fetch trailer only when dialog opens
 const handleDelete = async (review_id: string) => {
    try {
      await fetch(`http://localhost:8000/comments/${review_id}/`, {
        method: 'DELETE',
        credentials: 'include',
      })

      // Update local state instantly
      setReviews((prev) => prev.filter(r => r.id !== review_id))
    } catch (err) {
      console.error('Failed to delete review', err)
    }
  }
  const handleEdit = async (
    review_id: string,
    updated: { username: string; content: string; stars: number }
  ) => {
    try {
      await fetch(`http://localhost:8000/comments/${review_id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })

      // Update local state instantly
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review_id ? { ...r, ...updated } : r
        )
      )
    } catch (err) {
      console.error('Failed to update review', err)
    }
  }
  useEffect(() => {
    return
    fetch('http://localhost:8000/api/auth/me', {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUserId(parseInt(data?.id) ?? null))
      .catch(() => setCurrentUserId(null))
  }, [])

 
  
  const handleLike = async (review_id: string) => {  
    const response = await fetch(`http://localhost:8000/comments/${review_id}/like`, {
        credentials: "include",
        method: "POST",
      });
    
    }


  useEffect(() => {
    
    if (!trailerOpen || !movie)
      return
    setLoading(true)
    fetchTrailer(movie).then((url) => {
        setTrailerUrl(url);
        setLoading(false);
      });
    return () => setTrailerUrl(null)

  }, [trailerOpen, movie])
  
  useEffect(()=>{
    return
      const fetchComments = async () => {
      const response = await fetch(`http://localhost:8000/comments/${movieId}/`, {
        credentials: "include",
      });
      const reviewsList = await response.json();
      setReviews(reviewsList)
      return reviewsList;
    };

    fetchComments()
  },[])

  useEffect(() => {
    if (!movie || !["archive", "publicdomain"].includes(movie.source)) return;
    console.log("--------> Resolving streaming for movie", movie.id)
    fetch(`http://localhost:8000/api/streaming/resolve/${movie.id}/`)
      .catch(() => undefined);
  }, [movie])

    
  if (pending) return <DetailSkeleton />
  if (notFound) return <NotFound />
  if (!movie || error) return <NotFound message="Could not load movie details." />
  
  const isArchive   = movie.source === "archive"
  const hasTrailer  = !isArchive
  const director    = isArchive ? movie.director : undefined

  return (
    <main className="">
      <div
        className="relative  min-h-[100dvh]  bg-cover bg-center mb-4! "
          style={{
            backgroundImage: `url(${movie.backdrop_path ?? movie.poster_path})` }}
      >
        <div className="absolute inset-0  bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent h-full"/>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="z-20
                    px-4!
                    w-full!
                    [@media(max-height:500px)]:w-[min(50vw,500px)]
                    [@media(min-width:768px)_and_(min-height:500px)]:w-[min(60vw,500px)]
                    
                    relative
                    pt-50!
                    [@media(min-width:768px)_and_(min-height:500px)]:pt-100!
                    [@media(max-height:500px)]:pt-20!
                    [@media(min-height:900px)]:pt-90!
                    left-4 md:left-10 lg:left-16"
        >
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="font-[anton] text-white text-4xl md:text-5xl lg:text-6xl uppercase leading-none tracking-wide"
          >
            {movie.title}
          </motion.h1>
     
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
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="text-text-muted text-sm!  mb-2! "
          >
              <Overview text={stripHtml(movie.overview)} ></Overview>

          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            className=" mt-4! md:mt-6! flex flex-row gap-9"
          > 
            <Crow cast={movie.cast ?? []} crew={movie.crew ?? []} />        
          </motion.div>
          
          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="mt-4! md:mt-6! flex flex-row gap-2 "
          >
            <motion.div

            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >    
              <Button
                  asChild
                  className="h-12 w-35 bg-text-primary hover:bg-text-primary text-foreground font-semibold gap-2 rounded-md shadow-lg hover:shadow-xl  text-md"
              >
                <Link href={`/watch/${movie.id}`}>
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </Link>
              </Button>
              </motion.div>

              { (
                <motion.div
                  className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTrailerOpen(true)}
                >
                  <motion.div
                    whileHover={{ rotate: [-5, 5, -5, 0] }}
                    transition={{ duration: 0.4 }}
                    onClick={()=>setTrailerOpen(true)}
                  >
                    <Clapperboard className="h-8 w-8" color="#ffffff" />
                  </motion.div>
                </motion.div>
              )}

              {/* Watchlist */}
              <motion.div
                className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="h-8 w-8" color="#ffffff" />
                </motion.div>
              </motion.div>
          </motion.div>

          {/* Studios / production info */}
          
        </motion.div>

        {/* Trailer Dialog */}
        <Dialog
          open={trailerOpen}
          onOpenChange={(val) => {
            setTrailerOpen(val);
            if (!val) setTrailer(null);
          }}           
        >
          <DialogTitle className="sr-only hidden">Trailer</DialogTitle>
          <DialogContent
              style={{ maxWidth: "min(90vw, 900px)", width: "min(90vw, 900px)", }}
              className="p-0 bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden">
            <div className="h-full  w-full aspect-video bg-black">
              {
              loading ?(
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white"
                  />
                </div>
                )
              :
              (
                  trailerUrl ?(
                    <iframe
                      className="w-full h-full"
                      src={`${trailerUrl}`}
                      title="Movie Trailer"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ):
                  (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Clapperboard className="h-10 w-10 text-white/20" />
                      <p className="text-white/40 text-sm font-[poppins]">
                        No trailer available
                      </p>
                    </div>
                  )

              )

              }
          
            </div>

            <div className="pb-2" />
          </DialogContent>
        </Dialog>

        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/5" />

      </div>

      <div className="h-fit! px-4! md:px-16! py-2! flex flex-col gap-13">
        {collection && collection.parts.length > 0 && (
            <PrimeRow
              title={collection.name}
              movies={collection.parts}
            />
        )}
        <div className="space-y-2! mb-15!" >
            <HeaderTitle title="Reviews"/>

            <div className=" grid grid-cols-1 lg:grid-cols-12 gap-4! md:gap-0">
              <div className="lg:col-span-4">
                <FeedbackForm onSubmit={()=>{}} movie_id={movieId} />
              </div>

              <div className="lg:col-span-8 ">
                {
                  (reviews.length > 0)?
                  (
                    <ReviewsList reviews={reviews}
                     onLike={handleLike}  
                    currentUserId={currentUserId}   // 👈 logged-in user's ID
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    />

                  )
                  :
                  (
                      <div className="flex flex-col h-full items-center  justify-center py-16 px-8 gap-3 ">
                        <p className="text-4xl">🎬</p>
                        <p className="text-white/60 text-sm font-medium font-[poppins]">
                          No reviews yet
                        </p>
                        <p className="text-white/20 text-xs text-center">
                          The stage is yours  be the first to share your take.
                        </p>
                      </div>
                  )
                }
              </div>
            </div>
        </div>
      </div>
    </main>
  )
}

function DetailSkeleton() {
  return (
    <main>
      <div className="relative h-screen bg-[#0E0E10] overflow-hidden">
        {/* <div className="absolute inset-0 bg-linear-to-r from-[#0E0E10] via-[#0E0E10]/80 to-[#16161a]" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/5" /> */}

        <div className="z-40 w-[min(85vw,500px)] md:w-[min(40vw,700px)] absolute inset-0 top-[30%] md:top-[41%] left-4 md:left-16">
          <SkeletonBlock className="h-14 md:h-20 w-[min(82vw,520px)] mb-3!" />
          <SkeletonBlock className="h-4 w-56 mb-4!" />

          <div className="flex flex-wrap items-center gap-2! mb-4!">
            <SkeletonBlock className="h-6 w-18" />
            <SkeletonBlock className="h-6 w-14" />
            <SkeletonBlock className="h-6 w-12" />
            <SkeletonBlock className="h-6 w-20" />
          </div>

          <div className="flex flex-col gap-2! max-w-140 mb-6!">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-[92%]" />
            <SkeletonBlock className="h-4 w-[78%]" />
            <SkeletonBlock className="h-4 w-[64%]" />
          </div>

          <div className="flex gap-2! mb-6!">
            {[0, 1, 2, 3, 4].map(i => (
              <SkeletonBlock key={i} className="h-10 w-10 md:h-13 md:w-13 rounded-full" />
            ))}
          </div>

          <div className="flex gap-2!">
            <SkeletonBlock className="h-12 w-35" />
            <SkeletonBlock className="h-12 w-12" />
            <SkeletonBlock className="h-12 w-12" />
          </div>
        </div>
      </div>

      <div className="px-4! md:px-16! py-6! flex flex-col gap-4">
        <SkeletonBlock className="h-7 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <SkeletonBlock className="h-64 lg:col-span-4" />
          <div className="lg:col-span-8 flex flex-col gap-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
        </div>
      </div>
    </main>
  )
}


function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/5 ${className}`}>
      <motion.div
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["0%", "300%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}


function NotFound({ message = "Movie not found." }: { message?: string }) {
  return (
    <div className="h-screen flex items-center justify-center text-white/40">
      {message}
    </div>
  )
}
