

import { MovieResult } from "@/types/search";
import { Star } from "lucide-react";
import Image from "next/image";

export default function MovieCard({ movie }: { movie: MovieResult }) {
  return (
    <a
      href={`/movie/${movie.id}`}
      className="group block rounded-[8px] overflow-hidden border border-white/6 bg-white/3 hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="aspect-2/3 bg-white/5 relative overflow-hidden">
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
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
        {movie.rating && (
          <div className="absolute top-1.5! right-1.5! flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5! py-0.5! text-[10px] text-yellow-400/90">
            <Star className="h-2.5 w-2.5 fill-yellow-400/90" />
            {movie.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-2!">
        <p className="text-white/80 text-xs font-medium truncate leading-tight">{movie.title}</p>
        {movie.year && <p className="text-white/30 text-[10px] mt-0.5!">{movie.year}</p>}
      </div>
    </a>
  )
}