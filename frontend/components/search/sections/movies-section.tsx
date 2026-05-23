import Image from "next/image"
import { Film, Star } from "lucide-react"
import { highlightMatch } from "@/lib/utils/search-bar"
import { MovieResult } from "@/types/search"
import { SectionHeading } from "../section-heading"
import { resolveImage } from "./top-results-section"

type Props = {
  movies: MovieResult[]
  query: string
  activeIndex: number
  topCount: number
  onSelect: (movie: MovieResult) => void
}

export function MoviesSection({ movies, query, activeIndex, topCount, onSelect }: Props) {
  if (movies.length === 0) return null
  return (
    <div className="mb-4!">
      <SectionHeading label="Movies" />
      <div className="flex flex-col gap-0.5">
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            onClick={() => onSelect(movie)}
            className={`flex items-center gap-3 px-2! py-1.5! rounded-md cursor-pointer transition-all duration-100 ${
              activeIndex === topCount + i ? "bg-white/10" : "hover:bg-white/6"
            }`}
          >
            <div className="w-9 h-12 shrink-0 rounded-md bg-white/5 overflow-hidden relative">
              {movie.poster_path ? (
                <Image
                  src={resolveImage(movie.poster_path)!}
                  alt={movie.title}
                  fill
                  priority
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="h-3 w-3 text-white/20" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate font-medium">
                {highlightMatch(movie.title, query)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {movie.rating && (
                  <span className="text-[11px] text-yellow-400/60 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-yellow-400/60" />
                    {movie.rating.toFixed(1)}
                  </span>
                )}
                {movie.year && <span className="text-[11px] text-white/30">{movie.year}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}