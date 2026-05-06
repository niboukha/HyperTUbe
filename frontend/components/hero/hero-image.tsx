import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { backgroundVariants } from "@/lib/annimations/hero-variants"
import { MovieResult } from "@/types/search"

interface HeroImageProps {
  movie: MovieResult  
}

export default function HeroImage({ movie }: HeroImageProps) {
  return (
    <AnimatePresence mode="sync">
      {movie.backdrop_path && (
        <motion.div
          key={`background-${movie.id}`}
          variants={backgroundVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 will-change-transform"
        >
          <Image
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              fill
              sizes="100vw"
              className="object-cover transform-gpu will-change-transform"
              priority
              quality={90}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}