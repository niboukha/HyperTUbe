'use client'

import { AlertTriangle, Calendar, Clock, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useLanguage } from "@/hooks/use-language";
import { useMovieDetail } from "@/hooks/use-movie-details";

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

function preferredSubtitleLanguage(): string {
  // Read from the same cookie that use-language.ts writes when the user picks a
  // language in settings. This is always the user's explicit app preference.
  if (typeof document !== "undefined") {
    const cookie = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1];
    if (cookie) return cookie;
  }
  // Fall back to localStorage (use-language.ts key "ht_lang")
  try {
    const stored = localStorage.getItem("ht_lang");
    console.log("preferredSubtitleLanguage() read from localStorage:", stored);
    if (stored) return stored;
  } catch {}
  // Last resort: browser navigator language
  if (typeof navigator === "undefined") return "en";
  return (navigator.languages?.[0] || navigator.language || "en").split("-")[0];
}

export default function Watch() {
  const params   = useParams();
  const movieId  = params.id as string;
  const videoRef           = useRef<HTMLVideoElement>(null);
  const hlsRef             = useRef<Hls | null>(null);
  const resumeProgressRef  = useRef<number>(0);

  const { langCode } = useLanguage();
  const { data: movieDetail } = useMovieDetail(movieId);

  const [subtitles,        setSubtitles]        = useState<SubtitleTrack[]>([]);
  const [streamingMovieId, setStreamingMovieId] = useState<number | null>(null);
  const [hlsUrl,           setHlsUrl]           = useState<string | null>(null);
  const [streamStatus,     setStreamStatus]     = useState<StreamStatus["status"]>("idle");
  const [streamError,      setStreamError]      = useState<string | null>(null);
  const [retryCount,       setRetryCount]       = useState(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // ── Slow-connection warning (45 s into "downloading" with no progress) ──────
  useEffect(() => {
    if (streamStatus !== "downloading") {
      setIsSlowConnection(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowConnection(true), 45_000);
    return () => clearTimeout(timer);
  }, [streamStatus]);

  function handleRetry() {
    setStreamStatus("idle");
    setStreamError(null);
    setRetryCount((c) => c + 1);
  }

  // ── Step 0: fetch saved progress for resume ──────────────────────────────
  useEffect(() => {
    fetch(`${API}/history/${movieId}/progress/`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.progress > 0 && data.progress < 95) {
          resumeProgressRef.current = data.progress;
        }
      })
      .catch(() => {});
  }, [movieId]);

  // ── Step 1: resolve movie ID ──────────────────────────────────────────────
  // Archive movies return 202 while their metadata is still being fetched from
  // archive.org. Retry for up to 2 minutes before showing an error.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const retryForMs  = 120_000;
    const retryEveryMs = 5_000;

    async function resolveMovie() {
      try {
        const res = await fetch(`${API}/streaming/resolve/${movieId}/`, {
          credentials: "include",
        });

        if (res.status === 202) {
          if (!cancelled && Date.now() - startedAt < retryForMs) {
            retryTimer = setTimeout(resolveMovie, retryEveryMs);
          } else if (!cancelled) {
            setStreamError("This archive movie could not be indexed. Please try again later.");
          }
          return;
        }

        if (!res.ok) {
          if (!cancelled) setStreamError("This movie is not available for local streaming yet.");
          return;
        }

        const data: StreamingResolve = await res.json();
        if (!cancelled) {
          setStreamingMovieId(data.movie_id);
        }
      } catch {
        if (!cancelled) setStreamError("Could not connect to the streaming server.");
      }
    }

    resolveMovie();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [movieId]);

  // ── Step 2: poll stream status until ready ────────────────────────────────
  useEffect(() => {
    if (!streamingMovieId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const language = encodeURIComponent(preferredSubtitleLanguage());
        
        console.log("Polling stream status for movie", streamingMovieId, "with subtitle language", language);

        const res  = await fetch(`${API}/streaming/${streamingMovieId}/stream/?language=${language}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: StreamStatus = await res.json();
        if (cancelled) return;

        setStreamStatus(data.status ?? "idle");
        setStreamError(null);

        if (data.status === "ready" && data.movie_path) {
          setHlsUrl(toAbsoluteBackendUrl(data.movie_path));
          return; // stop polling — subtitles are loaded in the next effect
        }
        pollTimer = setTimeout(poll, 3000);
      } catch {
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
  }, [streamingMovieId, retryCount]);

  // ── Step 3: load subtitles once stream URL is known ───────────────────────
  // Depends on langCode so it re-runs when the user switches UI language.
  // On each run it also pings the stream endpoint to ensure the backend has
  // queued subtitle preparation for the current language (covers the case where
  // the stream was already ready before the user changed their language preference).
  // Retry logic: keep going until the preferred-language track is present in the
  // response (not just any track), so a French user doesn't get stuck with English
  // even though the French VTT finishes downloading shortly after the English one.
  useEffect(() => {
    if (!streamingMovieId || !hlsUrl) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const retryForMs  = 90_000;
    const retryEveryMs = 5_000;

    // Trigger subtitle preparation for the current language. Safe to call even
    // when stream is already ready — enqueue_subtitle_preparation_once is idempotent.
    fetch(`${API}/streaming/${streamingMovieId}/stream/?language=${encodeURIComponent(langCode)}`, {
      credentials: "include",
    }).catch(() => {});

    async function fetchSubtitles(): Promise<SubtitleTrack[]> {
      try {
        const res = await fetch(
          `${API}/streaming/${streamingMovieId}/subtitles/?language=${encodeURIComponent(langCode)}`,
          { credentials: "include" }
        );
        if (!res.ok) return [];
        const tracks: SubtitleTrack[] = await res.json();
        if (cancelled) return tracks;
        setSubtitles(tracks.map(track => ({ ...track, src: normalizeBackendUrl(track.src) })));
        return tracks;
      } catch {
        return [];
      }
    }

    async function loadSubtitles() {
      const tracks = await fetchSubtitles();
      if (cancelled) return;
      // Stop retrying only once the preferred language track has arrived.
      // This prevents the English-arrives-first early exit that left French
      // users with only one track until a manual refresh.
      const hasPreferred = tracks.some(t => t.language === langCode);
      if (!hasPreferred && Date.now() - startedAt < retryForMs) {
        retryTimer = setTimeout(loadSubtitles, retryEveryMs);
      }
    }

    loadSubtitles();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [streamingMovieId, hlsUrl, langCode]);

  // ── Step 4: track and persist watch progress ─────────────────────────────
  // Saves to POST /history/<movieId>/progress/ every 15 s, on pause, and on unload.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    let lastSaved = -1;

    function computeProgress(): number {
      if (!video || !video.duration || video.duration === Infinity) return 0;
      return Math.min(100, (video.currentTime / video.duration) * 100);
    }

    function saveProgress(progress: number) {
      const rounded = Math.round(progress);
      if (rounded === lastSaved) return;
      lastSaved = rounded;
      console.log("Saving watch progress for movie", streamingMovieId, ":", rounded + "%");
      fetch(`${API}/history/${movieId}/progress/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: rounded }),
      }).catch(() => {});
    }

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    function onTimeUpdate() {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        saveProgress(computeProgress());
      }, 15_000);
    }

    function onPause() {
      if (throttleTimer) { clearTimeout(throttleTimer); throttleTimer = null; }
      saveProgress(computeProgress());
    }

    function onUnload() {
      saveProgress(computeProgress());
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [hlsUrl, movieId]);

  // ── Step 5: attach HLS to <video> ────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (Hls.isSupported()) {
      const hls = new Hls({ debug: false, maxBufferHole: 0.5, nudgeMaxRetry: 5 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("[Watch] autoplay blocked:", e));
        const seekTo = () => {
          const p = resumeProgressRef.current;
          if (p > 0 && video.duration > 0) {
            video.currentTime = (p / 100) * video.duration;
          }
        };
        if (video.readyState >= 1) seekTo();
        else video.addEventListener("loadedmetadata", seekTo, { once: true });
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
        const p = resumeProgressRef.current;
        if (p > 0 && video.duration > 0) {
          video.currentTime = (p / 100) * video.duration;
        }
        video.play().catch(() => {});
      }, { once: true });
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl]);

  // ── Step 6: activate the preferred-language subtitle track ──────────────────
  // Priority: user's langCode → English fallback → first available track.
  // Depends on both `subtitles` (new tracks may have been added) and `langCode`
  // (user switched language — re-activate the right track without a page refresh).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || subtitles.length === 0) return;

    function activatePreferredTrack() {
      if (!video) return;
      const tracks = video.textTracks;
      let targetIndex = -1;

      // 1. Exact match for preferred language
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].language === langCode) { targetIndex = i; break; }
      }
      // 2. English fallback
      if (targetIndex === -1) {
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].language === "en") { targetIndex = i; break; }
        }
      }
      // 3. First available track
      if (targetIndex === -1 && tracks.length > 0) targetIndex = 0;

      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = i === targetIndex ? "showing" : "disabled";
      }
    }

    function onAddTrack(e: TrackEvent) {
      const track = e.track as TextTrack;
      if (!track || track.mode !== "disabled") return;

      const trackEl = Array.from(video!.querySelectorAll("track")).find(
        el => el.label === track.label && el.srclang === track.language
      );
      if (trackEl) {
        trackEl.addEventListener("load", activatePreferredTrack, { once: true });
        if ((trackEl as HTMLTrackElement).readyState === 2) activatePreferredTrack();
      } else {
        activatePreferredTrack();
      }
    }

    video.textTracks.addEventListener("addtrack", onAddTrack);
    // Activate immediately for tracks already present (e.g. language switch)
    if (video.textTracks.length > 0) activatePreferredTrack();

    return () => {
      video.textTracks.removeEventListener("addtrack", onAddTrack);
    };
  }, [subtitles, langCode]);

  return (
    <div className="min-h-screen flex flex-col items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15 ">
      <div className="!mt-10 w-full h-full flex flex-col items-center justify-center">
        <div className="h-[70vh] max-h-[70vh]">
          <div className="relative h-full w-full rounded-md border border-white/[0.07] bg-black">
            <video
              ref={videoRef}
              controls
              playsInline
              autoPlay
              muted
              crossOrigin="anonymous"
              width="100%"
              height="100%"
              className="rounded-md h-full w-full md:w-4xl   "
            >
              {subtitles.map((subtitle, index) => {
                const hasPreferredLang = subtitles.some(s => s.language === langCode);
                return (
                  <track
                    key={subtitle.id}
                    kind={subtitle.kind}
                    src={subtitle.src}
                    srcLang={subtitle.language}
                    label={subtitle.label}
                    default={
                      subtitle.language === langCode ||
                      (!hasPreferredLang && index === 0)
                    }
                  />
                );
              })}
            </video>

            {!hlsUrl && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/80 backdrop-blur-sm text-center">
                {streamError ? (
                  <div className="flex flex-col items-center gap-3 px-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
                      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-red-300">{streamError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-5 px-8">
                    {/* Spinner ring */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute h-16 w-16 rounded-full bg-white/5 animate-ping [animation-duration:2s]" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10">
                        <Loader2 className="h-6 w-6 text-white/80 animate-spin" />
                      </div>
                    </div>

                    {/* Title */}
                    {streamStatus === "downloading" && isSlowConnection ? (
                      <div className="flex flex-col items-center gap-3 max-w-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/25">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <p className="text-xs leading-relaxed text-amber-200/70">
                          This public domain movie currently has very few seeders. Finding peers is taking longer than usual. You can continue waiting, or try watching another movie.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold tracking-wide text-white animate-pulse">
                          {streamStatus === "processing"
                            ? "Optimizing video for streaming…"
                            : "Connecting to peers and downloading movie data…"}
                        </p>
                        <p className="text-xs text-white/40">
                          {streamStatus === "processing"
                            ? "Converting video into HLS segments, almost ready"
                            : "Waiting for enough data before playback can begin"}
                        </p>
                      </div>
                    )}

                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1 w-1 rounded-full bg-white/30 animate-pulse"
                          style={{ animationDelay: `${i * 300}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="!mt-3 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] !p-2 md:!p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
              <div className="flex-1 min-w-0 !space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{movieDetail?.title ?? "..."}</h1>
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Calendar className="w-3.5 h-3.5" />-
                  </div>
                  <span className="text-text-muted/50 hidden md:inline">|</span>
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Clock className="w-3.5 h-3.5" />-
                  </div>
                </div>

                {/* Debug: show subtitle state (dev only) */}
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





