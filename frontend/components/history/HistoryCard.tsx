"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Trash2 } from "lucide-react";
import { proxyImageUrl } from "@/lib/utils/movie";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { itemVariants } from "@/lib/annimations/hero-variants";
import { AvailabilityBadge } from "../ui/AvailabilityBadge";

type HistoryCardProps = {
  id: string;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: string[];
  release_date: string | null;
  vote_average: number;
  progress: number;
  runtimeLeft: string | null;
  onDelete?: () => void;
};

export default function HistoryCard({
  id, title, overview, backdrop_path, poster_path, genres,
  release_date, vote_average, progress, runtimeLeft, onDelete
}: HistoryCardProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      onClick={() => { if (!confirming) router.push(`/watch/${id}`) }}
      className="py-2! w-full max-h-[500px] md:h-[200px] flex flex-col sm:flex-row items-center md:items-start bg-[#333333] rounded-sm border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-colors relative"
    >

      {onDelete && (
        <div className="absolute top-2 right-2 z-10">
          <AnimatePresence mode="wait">
            {confirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm border border-white/10 rounded-full px-2! py-1!"
              >
                <span className="text-[10px] text-white/60 whitespace-nowrap">Remove?</span>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-[10px] text-white/40 hover:text-white/80 transition-colors px-1!"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirming(false); onDelete() }}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors px-1!"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="x"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                className="p-1! rounded-full bg-black/40 hover:bg-black/70 transition-colors"
                aria-label="Remove from history"
              >
                <X className="h-3.5 w-3.5 text-white/50 hover:text-white" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="w-full relative sm:w-[200px] md:w-[280px] h-50 md:h-[180px] flex-shrink-0 !p-2">
        {(backdrop_path || poster_path) ? (
          <img
            src={proxyImageUrl(backdrop_path || poster_path)!}
            alt={title}
            className="w-full h-full object-cover opacity-85 rounded-md!"
          />
        ) : (
          <div className="w-full h-full bg-white/5 rounded-md! flex items-center justify-center">
            <span className="text-white/15 text-3xl">🎬</span>
          </div>
        )}

        <div className="absolute -bottom-1! left-5! right-5!">
          <Progress value={progress} className="h-1! bg-text-primary/20" />
          <div className="absolute top-0! left-0! h-1! bg-accent-red rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 h-full flex flex-col p-4! min-w-0 gap-2 w-fit">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3!">
            <p className="text-md text-white truncate tracking-wide font-[anton]">{title}</p>
          </div>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed max-w-xl">{overview}</p>
        </div>

        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-1!">
          <AvailabilityBadge type="free" />
          <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
            {(vote_average || 0).toFixed(1)}
            <span className="text-text-muted/60">/10</span>
            <Star className="h-3 w-3 text-[#eab308] fill-[#eab308]" />
          </Badge>
          {release_date && (
            <>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className="text-text-muted text-xs rounded-md">
                {release_date.slice(0, 4)}
              </Badge>
            </>
          )}
          {runtimeLeft && (
            <>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className="text-text-muted text-xs rounded-md">
                {runtimeLeft}
              </Badge>
            </>
          )}
          {genres?.length > 0 && (
            <>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              {genres.map((item) => (
                <Badge key={item} variant="link" className="text-text-muted text-xs rounded-md">
                  {item}
                </Badge>
              ))}
            </>
          )}
        </motion.div>

        {runtimeLeft && (
          <div className="flex items-center gap-2 text-text-primary/50 text-xs">
            <span>{runtimeLeft} left</span>
          </div>
        )}
      </div>
    </div>
  );
}
