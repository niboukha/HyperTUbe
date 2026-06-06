'use client'

import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SubtitleTrack = {
  id: number;
  language: string;
  label: string;
  src: string;
  kind: "subtitles";
  source: string;
};

type StreamingResolve = {
  movie_id: number;
  title: string;
  stream_url: string;
  subtitles_url: string;
};

type StreamStatus = {
  status: "idle" | "downloading" | "processing" | "ready" | "error";
  movie_path: string | null;
  message?: string;
};

function normalizeBackendUrl(url: string) {
  try {
    const backend = new URL(API);
    const parsed = new URL(url, API);
    parsed.protocol = backend.protocol;
    parsed.host = backend.host;
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function Watch() {
  const params = useParams();
  const movieId = params.id as string;

  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [streamingMovieId, setStreamingMovieId] = useState<number | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState("Loading movie...");
  const [message, setMessage] = useState("Preparing stream...");

  useEffect(() => {
    async function resolveMovie() {
      try {
        const response = await fetch(`${API}/api/streaming/resolve/${movieId}/`, {
          credentials: "include",
        });

        if (!response.ok) {
          setMessage("This movie is not available for local streaming yet.");
          return;
        }

        const data: StreamingResolve = await response.json();
        setStreamingMovieId(data.movie_id);
        setMovieTitle(data.title);
      } catch {
        setMessage("Could not connect to the streaming server.");
      }
    }

    resolveMovie();
  }, [movieId]);

  useEffect(() => {
    if (!streamingMovieId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function loadStreamStatus() {
      try {
        const response = await fetch(`${API}/api/streaming/${streamingMovieId}/stream/`, {
          credentials: "include",
        });

        if (!response.ok) {
          setMessage("Could not prepare this stream.");
          return;
        }

        const data: StreamStatus = await response.json();
        if (cancelled) return;

        if (data.status === "ready" && data.movie_path) {
          setStreamUrl(`${API}${data.movie_path}`);
          setMessage("");
          return;
        }

        setMessage(`Stream status: ${data.status}`);
        timer = setTimeout(loadStreamStatus, 3000);
      } catch {
        if (!cancelled) setMessage("Could not connect to the streaming server.");
      }
    }

    loadStreamStatus();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [streamingMovieId]);

  useEffect(() => {
    if (!streamingMovieId) return;

    async function loadSubtitles() {
      try {
        const response = await fetch(`${API}/api/streaming/${streamingMovieId}/subtitles/`, {
          credentials: "include",
        });

        if (!response.ok) {
          setSubtitles([]);
          return;
        }

        const tracks: SubtitleTrack[] = await response.json();
        setSubtitles(
          tracks.map((track) => ({
            ...track,
            src: normalizeBackendUrl(track.src),
          }))
        );
      } catch {
        setSubtitles([]);
      }
    }

    loadSubtitles();
    const interval = setInterval(loadSubtitles, 5000);
    return () => clearInterval(interval);
  }, [streamingMovieId]);

  return (
    <div className="min-h-screen flex flex-col items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
      <div className="!mt-10 w-full h-full flex flex-col items-center justify-center">
        <div className="h-[70vh] max-h-[70vh]">
          <ReactPlayer
            controls
            crossOrigin="anonymous"
            width="100%"
            height="100%"
            className="rounded-md border-1 border-white/[0.07] border"
          >
            {streamUrl && <source src={streamUrl} type="application/x-mpegURL" />}
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

          {!streamUrl && (
            <div className="!mt-3 text-sm text-white/60">{message}</div>
          )}

          <div className="!mt-3 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] !p-2 md:!p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
              <div className="flex-1 min-w-0 !space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {movieTitle}
                  </h1>

                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    -
                  </div>

                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Clock className="w-3.5 h-3.5" />
                    -
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap md:flex-col gap-3 md:gap-2.5 shrink-0 md:items-end" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
