import { motion, AnimatePresence } from "framer-motion"
import { MovieResult } from "@/types/search"
import MovieCard from "./movie-card"
import { useRuntimes } from "@/hooks/use-runtimes"

type Props = {
  movies: MovieResult[]
}

export function MovieGrid({ movies }: Props) {
  const { runtimes, loading: runtimesLoading } = useRuntimes(
    movies.map(m => m.id)
  )

  return (
    <motion.div layout className="grid gap-2! grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
      {/* grid gap-2! grid-cols-[repeat(auto-fit,minmax(230px,1fr))] */}
      <AnimatePresence initial={false} mode="popLayout">
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
            <MovieCard
              index={i}
              movie={movie}
              runtime={runtimes[movie.id]}          // ← pass down
              runtimeLoading={runtimesLoading}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
