// 'use client';

// import TopBar from "@/components/header/top-bar"
// import { Badge } from "@/components/ui/badge";
// import Crow from "@/components/VedioDetails/Crow";
// import { useEffect, useState } from "react";
// // import MovieHoverCard from "@/components/MovieHoverCard";
// import { motion } from "framer-motion";
// import useEmblaCarousel from 'embla-carousel-react'
// import { Clapperboard,Play,Plus } from 'lucide-react';
// import { formatRuntime } from "@/utils/formatRuntime";
// import { Button } from "@/components/ui/button";
// import ReviewsList from "@/components/VedioDetails/ReviewsList";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import FeedbackForm from "@/components/VedioDetails/FeedbackForm";
// import Footer from "@/components/Footer";
// import { Review } from "@/types/Review";
// import HeaderTitle from "@/components/ui/header-title";
// import PrimeRow from "@/components/sections/prime-row";
// import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
// import { itemVariants } from "@/components/cards/hh";

// const INITIAL_REVIEWS: Review[] = [
//   {
//     id: '1',
//     author: 'Sarah Johnson',
//     rating: 5,
//     comment: 'Exceptional service! The team was professional and went above and beyond. Highly recommended!',
//     likes: 24,
//     isLiked: false,
//     date: new Date('2024-05-20'),
//     avatar: 'https://github.com/shadcn.png', // optional real image

//   },
//   {
//     id: '2',
//     author: 'Michael Chen',
//     rating: 4,
//     comment: 'Very good experience overall. Quick response time and friendly staff. Minor improvements in communication would be appreciated.',
//     likes: 12,
//     isLiked: false,
//     date: new Date('2024-05-18'),
//     avatar: 'https://github.com/shadcn.png', // optional real image

//   },
//   {
//     id: '3',
//     author: 'Emma Wilson',
//     rating: 5,
//     comment: 'Absolutely loved it! This service has changed how I work. The attention to detail is remarkable.',
//     likes: 31,
//     isLiked: false,
//     date: new Date('2024-05-15'),
//     avatar: 'https://github.com/shadcn.png', // optional real image

//   },

// ]

 
// const API_KEY = "c20857d1130f4dd9b51b60a3f91b7b1a"
// const TMDB_BASE = 'https://api.themoviedb.org/3';
// const avatars = [
//   {
//     name: "Shadcn",
//     username: "CN",
//     src: "https://github.com/shadcn.png",
//   },
//   {
//     name: "Evil",
//     username: "ER",
//     src: "https://github.com/evilrabbit.png",
//   },
//   {
//     name: "Max",
//     username: "LR",
//     src: "https://github.com/maxleiter.png",
//   },
//   {
//     name: "Evil",
//     username: "ER",
//     src: "https://github.com/evilrabbit.png",
//   },
//   {
//     name: "Evil",
//     username: "ER",
//     src: "https://github.com/evilrabbit.png",
//   },
// ];
// export default function VedioDetails()
// {
//   const [movieDetails,setMovieDetails] =useState("")
//   const [movieCollections,setMovieCollections] =useState("")
//   const [trailerOpen, setTrailerOpen] = useState<boolean>(false);
//   const [trailer, setTrailer] = useState<string | null>(null);


//   const [emblaRef, emblaApi] = useEmblaCarousel({ 
//     dragFree: true,
//     align: "start",
//   });

//   useEffect( ()=>{

//       async function getMovie() {
//         const res = await fetch(
//           `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=The Lord of the Rings`
//         );
//         const data = await res.json();
//         // console.log(data);
//       }
//       async function movieDetails() {


//        const movieDetails = await fetch(
//           `https://api.themoviedb.org/3/movie/122?api_key=${API_KEY}`
//         );
//         const data = await movieDetails.json();
//         setMovieDetails(data)
//         // console.log(data);
//       }

//       async function movieCollections() {

//       const season2 = await fetch(
//           `https://api.themoviedb.org/3/collection/119?api_key=${API_KEY}`
//         );
//         const data = await season2.json();
//         setMovieCollections(data)
//         // console.log(data);
//       }
//       async function movieTrailers() {
//           const res = await fetch(
//             `https://api.themoviedb.org/3/movie/122/videos?api_key=${API_KEY}`
//           );
//           const data = await res.json();

//           // // console.log(data);

//           // Filter only trailers (optional but useful)
//           const trailers = data.results.filter(
//             (video) => video.type === "Trailer" && video.site === "YouTube"
//           );

//           // // console.log("Trailers:", trailers);

//           // Example: get first trailer
//           if (trailers.length > 0) {
//             const trailerKey = trailers[0].key;
//             // const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
//             const youtubeUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`

//             setTrailer(youtubeUrl)
//             // console.log("Trailer URL:", youtubeUrl);
//             // https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0
//           }
//         }
//       getMovie();
//       movieDetails()
//       movieCollections()
//       movieTrailers()

//   },[trailerOpen])
    

//     return (
//       <main>
//         <div
//           className="relative h-screen bg-cover bg-center "
//             style={{
//               backgroundImage: `url(https://image.tmdb.org/t/p/original${movieDetails?.backdrop_path})`,
//             }}
//         >
//           <div className="absolute inset-0  bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent h-full"></div>
          
//           <motion.div 
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ duration: 0.5 }}
//             className=" z-40 w-[min(85vw,500px)] md:w-[min(40vw,700px)] absolute inset-0 top-[30%] md:top-[41%]  left-4 md:left-16"
//           >
//             <motion.h1 

//               initial={{ opacity: 0, x: -40 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
//               className=" font-[anton] text-[#FFFFFF]  text-2xl
//               lg:text-6xl font-meduim text-white uppercase 
//               leading-none tracking-wide max-w-[100%] !font-[anton]"
//             >
//               {movieDetails.original_title}
//             </motion.h1>

//             <motion.div 
//               initial={{ opacity: 0, x: -20 }}

//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
//               className="flex flex-wrap items-center gap-2! md:gap-2! mb-4! !mt-2 md:!mt-1"
//             >
//               <AvailabilityBadge type="premium" className="text-[10px] font-bold px-1.5! py-0.5!" badgeClassName="w-3 h-3" />
//               <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
//                   {(movieDetails?.vote_average || 0).toFixed(1)} 
//                             <span className="text-text-muted/60">/10</span>

//               </Badge>
//               <span className="text-text-muted/50 hidden md:inline">|</span>
//               <Badge variant="link" className=" text-text-muted text-xs rounded-md">
//                   {movieDetails.release_date?.split('-')[0]}
//               </Badge>
//               <span className="text-text-muted/50 hidden md:inline">|</span>
//               <Badge variant="link" className=" text-text-muted text-xs rounded-md">
//                   {formatRuntime(movieDetails.runtime)}
//               </Badge>
//               <span className="text-text-muted/50 hidden md:inline">|</span>
//               {
//                 movieDetails?.genres?.map((item)=>(
//                   <div className="flex gap-2!" key={item.id}>
//                     <Badge variant="link" className=" text-text-muted text-xs rounded-md">
//                     {item.name}
//                     </Badge>
//                     <span className="text-text-muted/50 hidden md:inline">|</span>

//                   </div>
//                 ))
//               }
//             </motion.div>

//             <motion.p 
//               initial={{ opacity: 0, x: -30 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
//               className="text-text-muted text-sm! max-w-140 mb-2! line-clamp-4"
//             >
//               {/* remove line-clamp for full description */}
//               {movieDetails.overview}
//             </motion.p>

//             <motion.div 
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
//               className=" !mt-4 md:!mt-6 flex flex-row gap-9"
//             > 
//               <Crow crow={avatars}/>        
//             </motion.div>

//             <motion.div
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
//               className="bordre-5 !mt-4 md:!mt-6 flex flex-row gap-2"
//             >
//               <motion.div
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               transition={{ type: "spring", stiffness: 400, damping: 15 }}
//               >    
//                 <Button
                  
//                     className="h-12 w-35 bg-text-primary hover:bg-text-primary text-foreground font-semibold gap-2 rounded-md shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-md"
//                 >
//                     <Play className="w-5 h-5 fill-current" />
//                     Watch Now
//                 </Button>
//                 </motion.div>
//                 <motion.div
//                   className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
//                   whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
//                   whileTap={{ scale: 0.9 }}
//                   transition={{ type: "spring", stiffness: 400, damping: 15 }}
//                 >
//                   <motion.div
//                     whileHover={{ rotate: [-5, 5, -5, 0] }}
//                     transition={{ duration: 0.4 }}
//                     onClick={()=>setTrailerOpen(true)}
//                   >
//                     <Clapperboard className="h-8 w-8" color="#ffffff" />
//                   </motion.div>
//                 </motion.div>
//                 <motion.div
//                   className="h-12 w-12 bg-[#FFFFFF]/14 backdrop-blur-lg rounded-md flex justify-center items-center cursor-pointer"
//                   whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
//                   whileTap={{ scale: 0.9 }}
//                   transition={{ type: "spring", stiffness: 400, damping: 15 }}
//                 >
//                   <motion.div
//                     whileHover={{ rotate: 90 }}
//                     transition={{ duration: 0.2 }}
//                   >
//                     <Plus className="h-8 w-8" color="#ffffff" />
//                   </motion.div>
//                 </motion.div>
//             </motion.div>
//           </motion.div>

//           {/* Trailer Dialog */}
//           <Dialog
//             open={trailerOpen}
//             onOpenChange={(val) => {
//               setTrailerOpen(val);
//               if (!val) setTrailer(null);
//             }}           
//           >
//             <DialogTitle className="sr-only hidden">Trailer</DialogTitle>
//             <DialogContent
//                style={{ maxWidth: "min(90vw, 900px)", width: "min(90vw, 900px)", }}
//                 className="p-0 bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden">
//               <div className="h-full  w-full aspect-video bg-black">
//                 {/* {(
//                   <div className="w-full h-full flex items-center justify-center">
//                     <motion.div
//                       animate={{ rotate: 360 }}
//                       transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
//                       className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white"
//                     />
//                   </div>
//                 )} */}

//                 {(
//                   <iframe
//                     className="w-full h-full"
//                     src={`${trailer}`}
//                     title="Movie Trailer"
//                     allow="autoplay; encrypted-media"
//                     allowFullScreen
//                   />
//                 )}

//                 {/* {(
//                   <div className="w-full h-full flex flex-col items-center justify-center gap-2">
//                     <Clapperboard className="h-10 w-10 text-white/20" />
//                     <p className="text-white/40 text-sm font-[poppins]">
//                       No trailer available
//                     </p>
//                   </div>
//                 )} */}
//               </div>

//               <div className="pb-2" />
//             </DialogContent>
//           </Dialog>

//           <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/5" />

//         </div>

//         <div className="!h-fit !px-4 md:!px-16 !py-2 flex flex-col gap-13">

//           {/* <HeaderTitle title="The Lord of the Rings Collection"/> */}
//           {/* <PrimeRow title="The Lord of the Rings Collection" endpoint="/api/movies/?type=collection/119"/> */}

//           <div className="space-y-2! " >
//               <HeaderTitle title="Reviews"/>

//              <div className=" grid grid-cols-1 lg:grid-cols-12 !gap-4 md:gap-0">
//                 <div className="lg:col-span-4">
//                   <FeedbackForm onSubmit={()=>{}} />
//                 </div>

//                 <div className="lg:col-span-8">
//                   <ReviewsList reviews={INITIAL_REVIEWS} onLike={()=>{}} />
//                 </div>
//               </div>
//           </div>
//         {/* <Footer/> */}
//         </div>
//       </main>
//     )
// }




'use client';

import { Badge } from "@/components/ui/badge";
import Crow from "@/components/VedioDetails/Crow";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react'
import { Clapperboard,Play,Plus, Star } from 'lucide-react';
import { formatRuntime } from "@/utils/formatRuntime";
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
import PrimeRow from "@/components/sections/prime-row";
import { getMovies } from "@/lib/utils/fetchMovies";
import { MovieResult } from "@/types/search";
import { useCollection } from "@/hooks/use-collection";

const API = "http://localhost:8000"

async function fetchMovieDetail(id: string): Promise<MovieDetail | null> {
  try {
    const res = await fetch(`${API}/movies/${id}/`)
    console.log("Fetched movie detail:", res, id)
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

const avatars = [
  {
    name: "Shadcn",
    username: "CN",
    src: "https://github.com/shadcn.png",
  },
  {
    name: "Evil",
    username: "ER",
    src: "https://github.com/evilrabbit.png",
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

  const params   = useParams()
  const movieId  = params.id as string   // e.g. "tmdb-1266127"

  const [movie,       setMovie]       = useState<MovieDetail | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [trailerUrl,  setTrailerUrl]  = useState<string | null>(null)
  const [reviews,     setReviews]     = useState<Review[]>([])

  const { data: collection, loading: collectionLoading } = useCollection(
    movie?.collection?.id
  )

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    dragFree: true,
    align: "start",
  });

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
      <div
        className="relative h-screen bg-cover bg-center "
          style={{
            backgroundImage: `url(${movie.backdrop_path ?? movie.poster_path})` }}
      >
        <div className="absolute inset-0  bg-gradient-to-r from-[#0E0E10]/88 via-[#000000]/50 to-transparent h-full"/>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className=" z-40 w-[min(85vw,500px)] md:w-[min(40vw,700px)] absolute inset-0 top-[30%] md:top-[41%] left-4 md:left-16"
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
          

          {/* neeeeeeeeeeeeeded */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            className=" !mt-4 md:!mt-6 flex flex-row gap-9"
          > 
            <Crow cast={movie.cast ?? []} crew={movie.crew ?? []} />        
             {/* <CastRow cast={movie.cast ?? []} /> */}
          </motion.div>
          
          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="!mt-4 md:!mt-6 flex flex-row gap-2"
          >
            <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >    
              <Button
                
                  className="h-12 w-35 bg-text-primary hover:bg-text-primary text-foreground font-semibold gap-2 rounded-md shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-md"
              >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
              </Button>
              </motion.div>

              {hasTrailer && (
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
          {movie.studios?.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-white/40 text-xs !mt-2 md:!mt-4"
            >
              <span>{movie.studios.join(" · ")}</span>
            </motion.div>
          )}
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

        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/5" />

      </div>

      <div className="!h-fit !px-4 md:!px-16 !py-2 flex flex-col gap-13">
        {collection && collection.parts.length > 0 && (
          // <div className="py-4!">
            <PrimeRow
              title={collection.name}
              movies={collection.parts}
            />
          // </div>
        )}
        
        <div className="space-y-2! " >
            <HeaderTitle title="Reviews"/>

            <div className=" grid grid-cols-1 lg:grid-cols-12 !gap-4 md:gap-0">
              <div className="lg:col-span-4">
                <FeedbackForm onSubmit={()=>{}} />
              </div>

              <div className="lg:col-span-8">
                <ReviewsList reviews={INITIAL_REVIEWS} onLike={()=>{}} />
              </div>
            </div>
        </div>
      {/* <Footer/> */}
      </div>
    </main>
  )
}

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


// components/VideoDetails/CastRow.tsx

import Image from "next/image"
import { User } from "lucide-react"
import { CastMember } from "@/types/movie"

type Props = { cast: CastMember[] }

export function CastRow({ cast }: Props) {
  if (!cast?.length) return null

  return (
    <div className="space-y-3!">
      <HeaderTitle title="Cast" />
      <div className="flex gap-3 overflow-x-auto pb-2!" style={{ scrollbarWidth: "none" }}>
        {cast.map(person => (
          <div
            key={person.id}
            className="shrink-0 flex flex-col items-center gap-1.5 w-20"
          >
            {/* Avatar */}
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/8 border border-white/10 shrink-0">
              {person.profile_path ? (
                <Image
                  src={person.profile_path}
                  alt={person.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white/20" />
                </div>
              )}
            </div>

            {/* Name + character */}
            <div className="text-center">
              <p className="text-white/80 text-[11px] font-medium leading-tight line-clamp-2">
                {person.name}
              </p>
              <p className="text-white/35 text-[10px] leading-tight line-clamp-1 mt-0.5!">
                {person.character}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}