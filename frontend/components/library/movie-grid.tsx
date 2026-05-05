import { motion, AnimatePresence } from "framer-motion"
import { MovieResult } from "@/types/search"
import MovieCard from "./movie-card"

type Props = {
  movies: MovieResult[]
}

export function MovieGrid({ movies }: Props) {
  return (
    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3!">
      <AnimatePresence mode="popLayout">
        {movies.map((movie, i) => (
          <motion.div
            key={movie.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: Math.min(i, 10) * 0.025, duration: 0.2 }}
            className=""
          >
            <MovieCard movie={movie} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}