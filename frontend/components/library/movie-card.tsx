import { MovieResult } from "@/types/search";
import { Star } from "lucide-react";
import Image from "next/image";
import { useHoverPortal } from "../carousel/use-hover-portal";

import { motion } from "framer-motion"
import { Play, Plus } from "lucide-react"

import Carousel from "@/components/carousel/carousel"
import CarouselPortal from "@/components/carousel/carousel-portal"
import { cardVariants } from "@/lib/annimations/continue-watching-variants"
import { mapToCards } from "@/lib/mock-data"
import { Movie } from "@/types/search"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { TooltipButton } from "../ui/tool-tip-button"


export default function MovieCard({ movie }: { movie: MovieResult }) {
  const {
    hover,
    handleMouseEnter,
    handleMouseLeave,
    clearHoverTimeout,
    getPortalStyle,
  } = useHoverPortal()

  const hoveredMovie = hover ? movie : null
  const isHovered = hover?.index === movie.id

  return (
    <>
      <motion.div
        key={movie.id}
        initial={false}
        variants={cardVariants}
        className="shrink-0 relative border border-transparent rounded-md overflow-hidden cursor-pointer"
        style={{ zIndex: isHovered ? 50 : 1 }}
        onMouseEnter={(e) => handleMouseEnter(e, movie.id)}
        onMouseLeave={handleMouseLeave}
        animate={
          hover && !isHovered
            ? { filter: "brightness(0.8)" }
            : { scale: 1, filter: "brightness(1)" }
        }
        transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
      >
        <div className="relative w-60 md:w-65 aspect-video rounded-md overflow-hidden cursor-pointer">
          {movie.backdrop_path || movie.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${movie.backdrop_path || movie.poster_path}`}
              alt={movie.title}
              fill
              sizes="360px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/15 text-4xl">🎬</span>
            </div>
          )}
        </div>
      </motion.div>

      {hoveredMovie && (
        <CarouselPortal
          hover={hover}
          image={`https://image.tmdb.org/t/p/w342${movie.backdrop_path || movie.poster_path}`}
          title={hoveredMovie.title}
          year={hoveredMovie.year}
          rating={hoveredMovie.rating}
          availability={hoveredMovie.availability}
          getPortalStyle={getPortalStyle}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          infoPanel={
            <div className="flex flex-col gap-1">
              <p className="text-text-primary/50 text-xs line-clamp-2">
                {hoveredMovie.overview}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TooltipButton
                  label="Watch now"
                  className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:bg-text-primary/80 transition"
                >
                  <Play className="h-4 w-4 text-background fill-background ml-0.5" />
                </TooltipButton>

                <TooltipButton
                  label="Add to watchlist"
                  className="w-8 h-8 rounded-full border border-text-primary/30 flex items-center justify-center hover:border-text-primary transition"
                >
                  <Plus className="h-4 w-4 text-text-primary" />
                </TooltipButton>
              </div>
            </div>
          }
        />
      )}


    </>
  )
}


// import { MovieResult } from "@/types/search";
// import { Star } from "lucide-react";
// import Image from "next/image";

// export default function MovieCard({ movie }: { movie: MovieResult }) {
//   return (
//     <a
//       href={`/movie/${movie.id}`}
//       className="group block rounded-[8px] overflow-hidden border border-white/6 bg-white/3 hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5"
//     >
//       <div className="aspect-2/3 bg-white/5 relative overflow-hidden">
//         {movie.poster_path ? (
//           <Image
//             src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
//             alt={movie.title}
//             fill
//             sizes="360px"
//             className="object-cover transition-transform duration-500 group-hover:scale-105"
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center">
//             <span className="text-white/15 text-4xl">🎬</span>
//           </div>
//         )}
//         {movie.rating && (
//           <div className="absolute top-1.5! right-1.5! flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5! py-0.5! text-[10px] text-yellow-400/90">
//             <Star className="h-2.5 w-2.5 fill-yellow-400/90" />
//             {movie.rating.toFixed(1)}
//           </div>
//         )}
//       </div>
//       <div className="p-2!">
//         <p className="text-white/80 text-xs font-medium truncate leading-tight">{movie.title}</p>
//         {movie.year && <p className="text-white/30 text-[10px] mt-0.5!">{movie.year}</p>}
//       </div>
//     </a>
//   )
// }