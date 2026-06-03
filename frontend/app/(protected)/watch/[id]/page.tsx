'use client'
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

type LocalMovie = {
  id: string;
  title: string;
  genres: { id: number; name: string }[];
  year: string;
  rating: number;
  runtime: string;
  studios: string;
  description: string;
};

const movies: LocalMovie[] = [
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

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const subtitle = "/subtitles/interstellar-en.vtt";

type StreamResponse = {
  status?: "idle" | "downloading" | "processing" | "ready" | "error";
  movie_path?: string | null;
  message?: string;
};

function toAbsoluteBackendUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function Watch() {
  const params   = useParams()
  const movieId  = params.id as string
  const movie = movies.find((m) => m.id === movieId);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamResponse["status"]>("idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const canStream = useMemo(() => /^\d+$/.test(movieId), [movieId]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch / poll stream
  useEffect(() => {
    if (!movieId || !canStream) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function loadStream() {
      try {
        // const token = getCookie("access_token");
        const response = await fetch(`${API_URL}/api/streaming/${movieId}/`, {
          credentials: "include",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: StreamResponse = await response.json();
        if (cancelled) return;

        setStreamStatus(data.status ?? "idle");
        setStreamError(null);

        if (data.status === "ready" && data.movie_path) {
          setHlsUrl(toAbsoluteBackendUrl(data.movie_path));
          return;
        }

        pollTimer = setTimeout(loadStream, 3000);
      } catch {
        if (cancelled) return;
        setStreamStatus("error");
        setStreamError("Could not start the stream. Please try again.");
      }
    }

    setHlsUrl(null);
    setStreamStatus("downloading");
    setStreamError(null);
    loadStream();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [canStream, movieId]);

  // Attach hls.js when URL is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    if (Hls.isSupported()) {
      const hlsInstance = new Hls();
      hlsInstance.loadSource(hlsUrl);
      hlsInstance.attachMedia(video);
      video.currentTime = 0;
      video.play().catch(() => {});
      return () => hlsInstance.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = hlsUrl;
    }
  }, [hlsUrl]);

  const playerError = canStream
    ? streamError
    : "This movie cannot be streamed from the torrent backend yet.";
  const title = movie?.title ?? `Movie #${movieId}`;
  const rating = movie?.rating ?? 0;
  const year = movie?.year ?? "";
  const runtime = movie?.runtime ?? "";

  return (
    <div className="min-h-screen flex flex-col items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
      <div className="!mt-10 w-full h-full flex flex-col items-center justify-center">
        <div className="h-[70vh] max-h-[70vh]">
          <div className="relative h-full w-full rounded-md border border-white/[0.07] bg-black">
            <video
              ref={videoRef}
              controls
              playsInline
              crossOrigin="anonymous"
              width="100%"
              height="100%"
              className="rounded-md h-full w-full"
            >
              <track kind="subtitles" src={subtitle} srcLang="en" label="English" default />
              <track kind="subtitles" src="/subtitles/interstellar-ja.vtt" srcLang="ja" label="Japanese" />
            </video>
            {!hlsUrl && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/80 text-center">
                <div className="!space-y-2 !px-6">
                  <p className="text-sm font-medium text-white">
                    {playerError ?? "Preparing your stream"}
                  </p>
                  {!playerError && (
                    <p className="text-xs text-white/50">
                      {streamStatus === "processing"
                        ? "Converting video to HLS segments..."
                        : "Starting backend download and waiting for .ts segments..."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="!mt-3 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] !p-2 md:!p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
              <div className="flex-1 min-w-0 !space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  {rating > 0 && (
                    <div className="flex items-center">
                      <Badge variant="link" className="text-text-muted text-xs gap-1 rounded-md">
                        <Star className="h-3 w-3 fill-yellow-400/70 text-yellow-400/70" />
                        {rating.toFixed(1)}
                        <span className="text-text-muted/60">/10</span>
                      </Badge>
                    </div>
                  )}
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  {year && (
                    <div className="flex items-center gap-2 text-white/40 text-sm"><Calendar className="w-3.5 h-3.5" />{year}</div>
                  )}
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  {runtime && (
                    <div className="flex items-center gap-2 text-white/40 text-sm"><Clock className="w-3.5 h-3.5" />{runtime}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}