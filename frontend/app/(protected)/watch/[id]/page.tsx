'use client'
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Clock, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { MovieDetail } from "@/types/movie";

const movies:any[] = [
  {
    id: "1",
    title: "Alexander Rybak ",
    genres: [
      {id: 1, name: "Sci-Fi" },
      {id: 2, name: "Adventure" },
      {id: 3, name: "drama" }

    ],
    year: "2014",
    rating: 8.6,
    runtime: "2h 49m",
    studios: 'International Pictures/RKO',
    description:
      "A breathtaking journey across dimensions of space and time, where love proves to be the one force that transcends the laws of the universe.",
  },
]

const videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SubtitleTrack = {
  id: number;
  language: string;
  label: string;
  src: string;
  kind: "subtitles";
  source: string;
};


export default function Watch()
{
    const params   = useParams()
    const movieId  = params.id as string
    const movie = movies.find((m) => m.id === movieId);
    const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

    useEffect(() => {
      async function loadSubtitles() {
        try {
          const response = await fetch(`${API}/api/streaming/${movieId}/subtitles/`, {
            credentials: "include",
          });

          if (!response.ok) {
            setSubtitles([]);
            return;
          }

          setSubtitles(await response.json());
        } catch {
          setSubtitles([]);
        }
      }

      loadSubtitles();
    }, [movieId]);

    return (
        <div className="min-h-screen flex flex-col items-center  !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
      
           
              <div className=" !mt-10 w-full  h-full flex  b flex-col items-center justify-center">
                <div className="  
                      h-[70vh]

                      max-h-[70vh]

                           
                      
                      
                      "
                >
                  <ReactPlayer controls 
                    width="100%"
                    height="100%"
                    className="rounded-md border-1   border-white/[0.07] border"
                    >
                    <source src={videoUrl} type="video/mp4"/>
                    {subtitles.map((subtitle, index) => (
                      <track
                        key={subtitle.id}
                        kind={subtitle.kind}
                        src={subtitle.src}
                        srcLang={subtitle.language}
                        label={subtitle.label}
                        default={index === 0}
                      />
                    ))}
                  </ReactPlayer>
                  <div className=" !mt-3  w-full rounded-xl border border-white/[0.07] bg-white/[0.03] !p-2 md:!p-6 ">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                      <div className="flex-1 min-w-0 !space-y-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 ">
                          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{movie.title}</h1>
                          <span className="text-text-muted/50 hidden md:inline">|</span>
                          {movie.rating > 0 && (
                            <div className="flex items-center">
                                <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
                                  <Star className="h-3 w-3 fill-yellow-400/70 text-yellow-400/70" />
                                  {movie.rating.toFixed(1)}
                                  <span className="text-text-muted/60">/10</span>
                                </Badge>
                            </div>
                          )}
                              <span className="text-text-muted/50 hidden md:inline">|</span>

                          <div className="flex items-center gap-2 text-white/40 text-sm"><Calendar className="w-3.5 h-3.5" />{movie.year}</div>
                            <span className="text-text-muted/50 hidden md:inline">|</span>

                          <div className="flex items-center gap-2 text-white/40 text-sm"><Clock className="w-3.5 h-3.5" />{movie.runtime}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap md:flex-col gap-3 md:gap-2.5 shrink-0 md:items-end">
                        
                      </div>
                    </div>
                  </div>
                 </div>
               
              </div>

        </div>
    )
}
