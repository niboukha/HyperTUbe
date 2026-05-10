"use client";
import { AnimatePresence, motion } from "framer-motion"
import { formatRuntime } from "@/utils/formatRuntime";
import { ChevronRight, Star } from "lucide-react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { itemVariants } from "@/lib/annimations/hero-variants";
import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres";
import { AvailabilityBadge } from "../ui/AvailabilityBadge";

type HistoryCardProps = {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  genres: string[];
  release_date: string;
  vote_average: number;
  progress: number; // 0-100
  runtimeLeft: string; // e.g. "2h 19m"
};

export default function HistoryCard({
  title, overview, backdrop_path, genres,
  release_date, vote_average, progress, runtimeLeft
}: HistoryCardProps) {
  return (
    <div className= "  !py-2 w-full  max-h-[500px]   md:h-[200px]  flex flex-col sm:flex-row  items-center md:items-start   bg-[#333333] rounded-sm border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-colors v">
      
      <div className="  w-full  relative sm:w-[200px] md:w-[280px] h-50 md:h-[180px]   flex-shrink-0 !p-2">
          <img
          src={`https://image.tmdb.org/t/p/w500${backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover opacity-85 !rounded-md "
          />

        <div className="absolute !-bottom-1 left-5! right-5!">
          <Progress value={progress} className="h-1! bg-text-primary/20" />
          <div className="absolute top-0! left-0! h-1! bg-accent-red rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 h-full flex flex-col !p-4 min-w-0 gap-2  w-fit ">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3!">
            <p className="text-md text-white truncate tracking-wide font-[anton] ">{title}</p>
          </div>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed max-w-xl ">{overview}</p>
        </div>
      

        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-1!">
        
          
          <AvailabilityBadge type="free" />
          <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
              {(vote_average || 0).toFixed(1)}
              <span className="text-text-muted/60">/10</span>
              <Star className="h-3 w-3 text-[#eab308] fill-[#eab308]" />
          </Badge>
          <span className="text-text-muted/50 hidden md:inline">|</span>
          <Badge variant="link" className=" text-text-muted text-xs rounded-md">
              { release_date.slice(0, 4) }
          </Badge>
          <span className="text-text-muted/50 hidden md:inline">|</span>
          <Badge variant="link" className=" text-text-muted text-xs rounded-md">
              {runtimeLeft}
          </Badge>
          <span className="text-text-muted/50 hidden md:inline">|</span>
          {genres?.map((item) => (
              <Badge key={item} variant="link" className="text-text-muted text-xs rounded-md">
                  {item}
              </Badge>
          ))}
        </motion.div>

        <div className="flex items-center gap-2 text-text-primary/50 text-xs">
          <span>{runtimeLeft} left</span>
        </div>

      </div>
    </div>
  );
}