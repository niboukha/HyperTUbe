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
import { formatRuntime } from "@/utils/formatRuntime";
import { ChevronRight } from "lucide-react";
import { Badge } from "./ui/badge";
export default function HistoryCard({
  title, overview, backdrop_path, genres,
  release_date, vote_average, progress, runtimeLeft
}: HistoryCardProps) {
  return (
    <div className= "min-w-6xl  max-w-6xl flex flex-col sm:flex-row  items-center md:items-start full max-h-[350px] min-h-[200px]  h-[500px] md:h-[200px] bg-[#333333] rounded-sm border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-colors">
      
      <div className="relative  h-[200px] ">
        <div className="relative  w-[300px] md:w-[300px]   h-full !rounded-md overflow-hidden !p-4 "  >
                <img
                src={`https://image.tmdb.org/t/p/w500${backdrop_path}`}
                alt={title}
                className="w-full h-full object-cover opacity-85 !rounded-md "
                />
                {/* play button + progress bar go inside here */}

            <div className="relative bottom-1  h-[3px] bg-white/20 !px-4   !rounded-md">
            <div className="h-full bg-[#BD0404]" style={{ width: `${progress}%` }} />
            </div>
        </div>
        {/* <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div className="w-9 h-9 rounded-full bg-white/15 border border-white/50 flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-white ml-0.5" />
          </div>
          </div> */}

      </div>

      {/* Info */}
      <div className="flex-1  h-full flex flex-col justify-between !p-4 min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-md font-bold text-white truncate font-[BebasNeue] ">{title}</p>
            <span className="text-xs text-white/50 whitespace-nowrap flex-shrink-0">{runtimeLeft}</span>
          </div>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed max-w-xl">{overview}</p>
        </div>
      

        <div 
             
              className="flex flex-wrap items-center gap-2! md:gap-2! mb-2! !mt-2 md:!mt-1"
            >
              <Badge variant="secondary" className="bg-accent-gold text-foreground border-0 text-sm font-bold! rounded-[6px] p-1!">
                  TMDb
              </Badge>
              <Badge variant="link" className=" text-text-muted text-xs gap-1 rounded-md">
                  {(vote_average || 0).toFixed(1)} 
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                 { release_date}
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              <Badge variant="link" className=" text-text-muted text-xs rounded-md">
                 {runtimeLeft}
              </Badge>
              <span className="text-text-muted/50 hidden md:inline">|</span>
              {
                  genres?.map((item)=>(
                    <div className="flex gap-2!">
                      <Badge key={item.id} variant="link" className=" text-text-muted text-xs rounded-md">
                      {item}
                      </Badge>
                      <span className="text-text-muted/50 hidden md:inline">|</span>

                    </div>
                  ))
              }
            </div>
      </div>
    </div>
  );
}