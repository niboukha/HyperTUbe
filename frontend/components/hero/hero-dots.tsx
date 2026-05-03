import { motion } from "framer-motion"
import { Movie } from "@/types/search"

type HeroDotsProps = {
  movies: Movie[]
  activeSlide: number
  handleSlideChange: (index: number) => void
  progress: number
}

export default function HeroDots({ movies, activeSlide, handleSlideChange, progress }: HeroDotsProps) {
  // console.log("Rendering HeroDots with activeSlide:", activeSlide, "and progress:", progress)
  return (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 flex-nowrap">
          
          {/* Counter */}
          {/* <div className="text-white/20 hover:text-white/50 text-xs font-medium tabular-nums transition-colors duration-300">
            {String(activeSlide + 1).padStart(2, "0")} / {String(movies.length).padStart(2, "0")}
          </div> */}

          {/* Dots row */}
          <div className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
            {movies.map((movie, index) => (
            <button
                key={`dot-${movie.id}`}
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
        </div>
  )
}
