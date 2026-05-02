'use client';

import TopBar from "@/components/header/top-bar"
import { Badge } from "@/components/ui/badge";
import Crow from "@/components/VedioDetails/Crow";
import { useEffect, useState } from "react";
import MovieHoverCard from "@/components/MovieHoverCard";
import { motion } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react'
import { Clapperboard,Plus } from 'lucide-react';
import { formatRuntime } from "@/utils/formatRuntime";
import { Button } from "@/components/ui/button";
import ReviewsList from "@/components/VedioDetails/ReviewsList";
import type { Review } from '@/types'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FeedbackForm from "@/components/VedioDetails/FeedbackForm";
import Footer from "@/components/Footer";

const INITIAL_REVIEWS: Review[] = [
  {
    id: '1',
    author: 'Sarah Johnson',
    rating: 5,
    comment: 'Exceptional service! The team was professional and went above and beyond. Highly recommended!',
    likes: 24,
    isLiked: false,
    date: new Date('2024-05-20'),
    avatar: 'https://github.com/shadcn.png', // optional real image

  },
  {
    id: '2',
    author: 'Michael Chen',
    rating: 4,
    comment: 'Very good experience overall. Quick response time and friendly staff. Minor improvements in communication would be appreciated.',
    likes: 12,
    isLiked: false,
    date: new Date('2024-05-18'),
    avatar: 'https://github.com/shadcn.png', // optional real image

  },
  {
    id: '3',
    author: 'Emma Wilson',
    rating: 5,
    comment: 'Absolutely loved it! This service has changed how I work. The attention to detail is remarkable.',
    likes: 31,
    isLiked: false,
    date: new Date('2024-05-15'),
    avatar: 'https://github.com/shadcn.png', // optional real image

  },

]

 
const API_KEY = "c20857d1130f4dd9b51b60a3f91b7b1a"
const TMDB_BASE = 'https://api.themoviedb.org/3';
const avatars = [
  {
    name: "Shadcn",
    username: "CN",
    src: "https://github.com/shadcn.png",
  },
  {
    name: "Max",
    username: "LR",
    src: "https://github.com/maxleiter.png",
  },
  {
    name: "Evil",
    username: "ER",
    src: "https://github.com/evilrabbit.png",
  },
  {
    name: "Evil",
    username: "ER",
    src: "https://github.com/evilrabbit.png",
  },
];
export default function VedioDetails()
{
  const [movieDetails,setMovieDetails] =useState("")
  const [movieCollections,setMovieCollections] =useState("")
  const [trailerOpen, setTrailerOpen] = useState<boolean>(false);
  const [trailer, setTrailer] = useState<string | null>(null);


  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    dragFree: true,
    align: "start",
  });

  useEffect( ()=>{

      async function getMovie() {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=The Lord of the Rings`
        );
        const data = await res.json();
        console.log(data);
      }
      async function movieDetails() {


       const movieDetails = await fetch(
          `https://api.themoviedb.org/3/movie/122?api_key=${API_KEY}`
        );
        const data = await movieDetails.json();
        setMovieDetails(data)
        console.log(data);
      }

      async function movieCollections() {

      const season2 = await fetch(
          `https://api.themoviedb.org/3/collection/119?api_key=${API_KEY}`
        );
        const data = await season2.json();
        setMovieCollections(data)
        console.log(data);
      }
      async function movieTrailers() {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/122/videos?api_key=${API_KEY}`
          );
          const data = await res.json();

          console.log(data);

          // Filter only trailers (optional but useful)
          const trailers = data.results.filter(
            (video) => video.type === "Trailer" && video.site === "YouTube"
          );

          console.log("Trailers:", trailers);

          // Example: get first trailer
          if (trailers.length > 0) {
            const trailerKey = trailers[0].key;
            // const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
            const youtubeUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`

            setTrailer(youtubeUrl)
            console.log("Trailer URL:", youtubeUrl);
            // https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0
          }
        }
      getMovie();
      movieDetails()
      movieCollections()
      movieTrailers()

  },[trailerOpen])
  
    return (
      <main>
        <TopBar/>
        {/* image section or hero section */}
        <div
          className="relative h-screen bg-cover bg-center "
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/original${movieDetails?.backdrop_path})`,
            }}
        >
          <div className=" absolute inset-0  bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent h-full  "></div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className=" z-40 w-[min(85vw,500px)] md:w-[min(30vw,700px)] absolute inset-0 top-[30%] md:top-[35%]  left-4 md:left-16"
          >
            <motion.h1 

              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className=" font-[anton] text-[#FFFFFF]  text-2xl
              lg:text-6xl font-meduim text-white uppercase 
              leading-none tracking-tight  max-w-[100%] !font-[anton]">
            {movieDetails.original_title}
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}

              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-2! md:gap-2! mb-2! !mt-2 md:!mt-1"
            >
              <Badge variant="secondary" className="bg-accent-gold text-foreground border-0 text-sm font-bold! rounded-[6px] p-1!">
                  TMDb
              </Badge>
              <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
                  {(movieDetails?.vote_average || 0).toFixed(1)} 
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                  {movieDetails.release_date?.split('-')[0]}
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                  {formatRuntime(movieDetails.runtime)}
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              {
                  movieDetails?.genres?.map((item)=>(
                    <div className="flex gap-2!">
                      <Badge key={item.id} variant="link" className=" text-text-muted text-xs rounded-md">
                      {item.name}
                      </Badge>
                      <span className="text-text-muted/50 hidden md:inline">|</span>

                    </div>
                  ))
              }
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
              className="max-w-xl text-[#ffffff]  !mt-1 md:!mt-5"
            >
              <p className=" text-sm   md:!text-md h-fit">
              {/* {movieDetails.overview}
              */}
              As armies mass for a final battle that will decide the fate of the world--and powerful, 
              ancient forces of Light and Dark compete to determine the outcome--one member 
              of the Fellowship of the Ring is revealed as the noble heir to the throne of
              the Kings of Men. Yet, the sole hope for triumph over evil lies with a brave hobbit,
              Frodo, who.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              className=" !mt-4 md:!mt-6 flex flex-row gap-9"
            > 
              <Crow crow={avatars}/>        
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
              className="bordre-5 !mt-6 md:!mt-12 flex flex-row gap-4"
            >
              <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >    
                <Button className="!py-6 !px-8 text-lg bg-[#BD0404] font-bold !rounded-md relative">
                  Watch now
                </Button>
                </motion.div>
                <motion.div
                  className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <motion.div
                    whileHover={{ rotate: [-5, 5, -5, 0] }}
                    transition={{ duration: 0.4 }}
                    onClick={()=>setTrailerOpen(true)}
                  >
                    <Clapperboard className="h-8 w-8" color="#ffffff" />
                  </motion.div>
                </motion.div>
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
          </motion.div>
          {/* Trailer Dialog */}
          <Dialog
            open={trailerOpen}
            onOpenChange={(val) => {
              setTrailerOpen(val);
              if (!val) setTrailer(null);
            }}           
          >
            <DialogContent
               style={{ maxWidth: "min(90vw, 900px)", width: "min(90vw, 900px)", }}
                className="p-0 bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden">
              <div className="h-full  w-full aspect-video bg-black">
                {/* {(
                  <div className="w-full h-full flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white"
                    />
                  </div>
                )} */}

                {(
                  <iframe
                    className="w-full h-full"
                    src={`${trailer}`}
                    title="Movie Trailer"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}

                {/* {(
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Clapperboard className="h-10 w-10 text-white/20" />
                    <p className="text-white/40 text-sm font-[poppins]">
                      No trailer available
                    </p>
                  </div>
                )} */}
              </div>

              <div className="pb-2" />
            </DialogContent>
          </Dialog>

        <div className="  absolute inset-0 bg-linear-to-t from-background via-transparent to-background/5" />

        </div>
        <div className=" !pt-10 min-h-screen bg-[#0E0E10] !px-4  md:!px-16   !py-2 ">
          <div className=" !space-y-10 ">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#BD0404] " />
              <h3 className="text-white text-lg !font-medium">
              The Lord of the Rings Collection
              </h3>
            </div>
            <div className="relative !mt-4">
              <div ref={emblaRef} className="overflow-hidden">
                <motion.div 
                    className="flex gap-6"
                    layout
                >
                  {movieCollections?.parts?.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="shrink-0"
                    >
                      <MovieHoverCard item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              <button
                  onClick={() => emblaApi?.scrollPrev()}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-50 bg-black/60 hover:bg-black/90 text-white text-2xl rounded-full w-10 h-10 flex items-center justify-center border border-white/10 backdrop-blur-sm"
              >
                ‹
              </button>
              <button
                onClick={() => emblaApi?.scrollNext()}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-50 bg-black/60 hover:bg-black/90 text-white text-2xl rounded-full w-10 h-10 flex items-center justify-center border border-white/10 backdrop-blur-sm"
              >
                ›
              </button>
            </div>
          </div>
          <div className="!mt-12   !space-y-10 " >
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#BD0404] " />
              <h3 className="text-white text-lg !font-medium">
              Reviews
              </h3>
            </div>
             <div className=" grid grid-cols-1 lg:grid-cols-5 !gap-4 md:gap-0 !mt-4 ">
                <div className=" lg:col-span-2 ">
                    <FeedbackForm onSubmit={()=>{}} />
                </div>

                <div className="lg:col-span-3">
                  <ReviewsList reviews={INITIAL_REVIEWS} onLike={()=>{}} />
                </div>
              </div>
          </div>
        </div>
        {/* <Footer/> */}
      </main>
    )
}