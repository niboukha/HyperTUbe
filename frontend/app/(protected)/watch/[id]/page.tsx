'use client'

import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

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
    const parsed  = new URL(url, API);
    parsed.protocol = backend.protocol;
    parsed.host     = backend.host;
    return parsed.toString();
  } catch {
    return url;
  }
}

function toAbsoluteBackendUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return normalizeBackendUrl(path);
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function Watch() {
  const params  = useParams();
  const movieId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);

  const [subtitles,         setSubtitles]         = useState<SubtitleTrack[]>([]);
  const [streamingMovieId,  setStreamingMovieId]  = useState<number | null>(null);
  const [hlsUrl,            setHlsUrl]            = useState<string | null>(null);
  const [streamStatus,      setStreamStatus]      = useState<StreamStatus["status"]>("idle");
  const [streamError,       setStreamError]       = useState<string | null>(null);
  const [movieTitle,        setMovieTitle]        = useState("Loading movie...");

  // ── Step 1: resolve movie ID ──────────────────────────────────────────────
  useEffect(() => {
    async function resolveMovie() {
      try {
        const res = await fetch(`${API}/api/streaming/resolve/${movieId}/`, {
          credentials: "include",
        });
        if (!res.ok) {
          setStreamError("This movie is not available for local streaming yet.");
          return;
        }
        const data: StreamingResolve = await res.json();
        setStreamingMovieId(data.movie_id);
        setMovieTitle(data.title);
      } catch (e) {
        setStreamError("Could not connect to the streaming server.");
      }
    }
    resolveMovie();
  }, [movieId]);

  // ── Step 2: poll for stream readiness ────────────────────────────────────
  useEffect(() => {
    if (!streamingMovieId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res  = await fetch(`${API}/api/streaming/${streamingMovieId}/stream/`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: StreamStatus = await res.json();
        if (cancelled) return;

        setStreamStatus(data.status ?? "idle");
        setStreamError(null);

        if (data.status === "ready" && data.movie_path) {
          setHlsUrl(toAbsoluteBackendUrl(data.movie_path));
          return;   // stop polling
        }
        pollTimer = setTimeout(poll, 3000);
      } catch (e) {
        if (cancelled) return;
        setStreamStatus("error");
        setStreamError("Could not start the stream. Please try again.");
      }
    }

    setHlsUrl(null);
    setStreamStatus("downloading");
    setStreamError(null);
    poll();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [streamingMovieId]);

  // ── Step 3: fetch subtitles ───────────────────────────────────────────────
  useEffect(() => {
    if (!streamingMovieId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function loadSubtitles(): Promise<boolean> {
      try {
        const res = await fetch(`${API}/api/streaming/${streamingMovieId}/subtitles/`, {
          credentials: "include",
        });
        if (!res.ok) {
          setSubtitles([]);
          return false;
        }
        const tracks: SubtitleTrack[] = await res.json();
        if (!cancelled) {
          setSubtitles(
            tracks.map(track => ({
              ...track,
              src: normalizeBackendUrl(track.src),
            }))
          );
        }
        return tracks.length > 0;
      } catch (e) {
        if (!cancelled) setSubtitles([]);
        return false;
      }
    }

    async function pollSubtitles() {
      const foundTracks = await loadSubtitles();
      if (!cancelled && !foundTracks) {
        pollTimer = setTimeout(pollSubtitles, 5000);
      }
    }

    pollSubtitles();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [streamingMovieId]);

  // ── Step 4: attach HLS + inject subtitle tracks via TextTrack API ─────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Destroy previous HLS instance
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        maxBufferHole: 0.5,
        nudgeMaxRetry: 5,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("[Watch] autoplay blocked:", e));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setStreamStatus("error");
          setStreamError("The stream failed to load. Please try another movie or retry later.");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      }, { once: true });
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl || subtitles.length === 0) return;

    const timer = window.setTimeout(() => {
      for (let index = 0; index < video.textTracks.length; index += 1) {
        video.textTracks[index].mode = index === 0 ? "showing" : "disabled";
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [subtitles, hlsUrl]);

  return (
    <div className="min-h-screen flex flex-col items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
      <div className="!mt-10 w-full h-full flex flex-col items-center justify-center">
        <div className="h-[70vh] max-h-[70vh]">
          <div className="relative h-full w-full rounded-md border border-white/[0.07] bg-black">
            {/*
              ✅ Key fix: render <track> elements so they exist in the DOM.
              The TextTrack API injection below is the reliable method,
              but having <track> tags also helps some browsers.
            */}
            <video
              ref={videoRef}
              controls
              playsInline
              crossOrigin="anonymous"
              width="100%"
              height="100%"
              className="rounded-md h-full w-full"
            >
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
            </video>

            {!hlsUrl && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/80 text-center">
                <div className="!space-y-2 !px-6">
                  <p className="text-sm font-medium text-white">
                    {streamError ?? "Preparing your stream"}
                  </p>
                  {!streamError && (
                    <p className="text-xs text-white/50">
                      {streamStatus === "processing"
                        ? "Converting video to HLS segments..."
                        : "Starting backend download and waiting for stream segments..."}
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
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{movieTitle}</h1>
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Calendar className="w-3.5 h-3.5" />-
                  </div>
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Clock className="w-3.5 h-3.5" />-
                  </div>
                </div>

                {/* Debug: show subtitle state */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-white/30 font-mono">
                    subtitles: {subtitles.length} track(s)
                    {subtitles.map(s => (
                      <div key={s.id}>→ [{s.language}] {s.label} | {s.src}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap md:flex-col gap-3 md:gap-2.5 shrink-0 md:items-end" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
