"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import {
  Play,
  Star,
  Clock,
  Bookmark,
  BookmarkCheck,
  Crown,
  Zap,
} from "lucide-react";
import { AvailabilityBadge } from "../ui/AvailabilityBadge";

//tmp
export type Movie = {
  id: string;
  title: string;
  poster: string;     
  backdrop: string;    
  rating: number;         
  year: number; 
  duration: string;
  genres: string[]; 
  overview: string;
  isSaved: boolean;
  availability: "free" | "premium";
};

const IMG = "https://image.tmdb.org/t/p";

function formatRuntime(min: number | undefined): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function normaliseTMDB(raw: any, genreMap: Record<number, string>): Movie {
  return {
    id:           `tmdb-${raw.id}`,
    title:        raw.title || raw.name || "Untitled",
    poster:       raw.poster_path  ? `${IMG}/w500${raw.poster_path}`   : "",
    backdrop:     raw.backdrop_path? `${IMG}/w1280${raw.backdrop_path}`: "",
    rating:       raw.vote_average ? +raw.vote_average.toFixed(1) : 0,
    year:         raw.release_date ? +raw.release_date.slice(0, 4) : 0,
    duration:     formatRuntime(raw.runtime),
    genres:       (raw.genre_ids ?? raw.genres?.map((g: any) => g.id) ?? [])
                    .map((id: number) => genreMap[id])
                    .filter(Boolean)
                    .slice(0, 3),
    overview:     raw.overview ?? "",
    isSaved:      false,
    availability: (raw.availability as "free" | "premium") ?? "premium",
  };
}


interface CardProps {
  movie: Movie;
  onToggleSave: (id: string) => void;
  portalStyle?: React.CSSProperties;
  motionProps?: React.ComponentProps<typeof motion.div>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
// end of tmp

export function MovieCard({
  movie,
  onToggleSave,
  portalStyle,
  motionProps,
  onMouseEnter,
  onMouseLeave,
}: CardProps) {
  const router  = useRouter();
  const [imgErr, setImgErr] = useState(false);

  const goWatch = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/watch/${movie.id}`);
    },
    [movie.id, router],
  );

  const toggleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSave(movie.id);
    },
    [movie.id, onToggleSave],
  );

  const backdropSrc = imgErr || !movie.backdrop ? null : movie.backdrop;

  return (
    <motion.div
      {...motionProps}
      style={portalStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="
        group relative flex flex-col rounded-md overflow-hidden bg-[#333333] cursor-pointer select-none transition-shadow duration-300"
      onClick={goWatch}
    >
        <div className="relative w-full aspect-16/10 overflow-hidden">

            {backdropSrc ? (
            <Image
                src={backdropSrc}
                alt={movie.title}
                fill
                sizes="(max-width:768px) 100vw, 400px"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                onError={() => setImgErr(true)}
                priority
            />
            ) : (
                <div className="w-full h-full bg-[#333333] flex items-center justify-center">
                    <span className="text-white/10 text-5xl">🎬</span>
                </div>
            )}
            
            <div className="absolute top-2.5! right-2.5! z-10">
              <AvailabilityBadge type={movie.availability} />
            </div>

            <button
            onClick={goWatch}
            aria-label={`Play ${movie.title}`}
            className="
                absolute inset-0 flex items-center justify-center z-10
                pointer-events-none group-hover:pointer-events-auto
            "
            >
            <motion.div
                initial={{ opacity: 0.25, scale: 0.88 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="
                w-11 h-11 rounded-full
                bg-white/10 backdrop-blur-md
                border border-white/20
                flex items-center justify-center
                transition-colors duration-200
                group-hover:bg-white/90 group-hover:border-white
                "
            >
                <Play className="w-4 h-4 text-foreground fill-foreground ml-0.5" />
            </motion.div>
            </button>
        </div>

        <div className="
            relative flex flex-col gap-2 px-3! pt-2! pb-3!
            border-t border-white/4
        ">

        <div className="flex justify-between">
            <h3 className="
            text-white font-title text-sm leading-tight tracking-wide
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]
            line-clamp-2
            ">
            {movie.title}
            </h3>
            <div className="flex items-center justify-end mt-0.5">
            <button
            onClick={toggleSave}
            className="
                flex items-center gap-1 text-[10px] font-medium
                transition-colors duration-150
                text-white/30 hover:text-white/70
            "
            >
            {movie.isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-white fill-white" />
            ) : (
                <Bookmark className="w-5 h-5" />
            )}
            </button>
        </div>
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
            {movie.rating > 0 && (
            <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-[#eab308] fill-[#eab308]" />
                <span className="text-[#eab308] text-[11px] font-semibold">{movie.rating}</span>
            </span>
            )}
            {movie.rating > 0 && movie.year > 0 && (
            <span className="text-white/20 text-[10px]">•</span>
            )}
            {movie.year > 0 && (
            <span className="text-white/45 text-[11px]">{movie.year}</span>
            )}
            {movie.duration && (
            <>
                <span className="text-white/20 text-[10px]">•</span>
                <span className="flex items-center gap-0.5 text-white/40 text-[11px]">
                <Clock className="w-2.5 h-2.5" />
                {movie.duration}
                </span>
            </>
            )}
        </div>

        {movie.genres.length > 0 && (
            <div className="flex gap-1 flex-wrap">
            {movie.genres.map((g) => (
                <span
                key={g}
                className="
                    text-[9px] px-1.5! py-0.5! rounded-md
                    bg-white/6 text-white/40
                    border border-white/6
                    tracking-wide
                "
                >
                {g}
                </span>
            ))}
            </div>
        )}

        {movie.overview && (
          <p className="text-white/30 text-[11px] leading-relaxed line-clamp-2">
            {movie.overview}
          </p>
        )}
    </div>
        {/* <div className="
            absolute inset-0 rounded-md pointer-events-none
            ring-[0.5px] ring-white/[0.07]
            group-hover:ring-white/13 transition-all duration-300
        " /> */}
    </motion.div>
  );
}
