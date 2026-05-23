import Image from "next/image"
import { Film, Star } from "lucide-react"
import { highlightMatch } from "@/lib/utils/search-bar"
import { MovieResult } from "@/types/search"
import { SectionHeading } from "../section-heading"

type Props = {
  movies: MovieResult[]
  query: string
  activeIndex: number
  onSelect: (movie: MovieResult) => void
}

export function resolveImage(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path                          // ✅ Django full URL
  return `https://image.tmdb.org/t/p/w200${path}`                  // legacy bare path
}

export function TopResultsSection({ movies, query, activeIndex, onSelect }: Props) {
  if (movies.length === 0) return null

  return (
    <div className="mb-4!">
      <SectionHeading icon={<Film className="h-3 w-3" />} label="Top results" />

      <div className="flex gap-2 overflow-x-auto py-1.5!" style={{ scrollbarWidth: "none" }}>
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            onClick={() => onSelect(movie)}
            className={`shrink-0 w-28 cursor-pointer rounded-md overflow-hidden border transition-all duration-150 hover:scale-105 hover:border-white/30 ${
              activeIndex === i ? "border-white/25 scale-105" : "border-white/8"
            }`}
          >
            <div className="aspect-[2/3] bg-white/5 relative">
              {movie.poster_path ? (
                <Image
                  src={resolveImage(movie.poster_path)!}
                  alt={movie.title}
                  fill
                  priority
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="h-6 w-6 text-white/20" />
                </div>
              )}
            </div>
            <div className="p-1.5! bg-black/40">
              <p className="text-white/80 text-[11px] font-medium truncate leading-tight">
                {highlightMatch(movie.title, query)}
              </p>
              {(movie.year || movie.rating) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {movie.rating && (
                    <span className="text-[10px] text-yellow-400/70 flex items-center gap-0.5">
                      <Star className="h-2 w-2 fill-yellow-400/70" />
                      {movie.rating.toFixed(1)}
                    </span>
                  )}
                  {movie.year && <span className="text-[10px] text-white/30">{movie.year}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}