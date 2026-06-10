'use client'

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

function preferredSubtitleLanguage() {
  // Temporary test mode: force English subtitles only.
  // Re-enable this after English-only validation:
  if (typeof navigator === "undefined") return "en";
  return (navigator.languages?.[0] || navigator.language || "en").split("-")[0];
  // return "en";
}

export default function Watch() {
  const params   = useParams();
  const movieId  = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const appliedSubtitleOffsetRef = useRef(0);
  const desiredSubtitleOffsetRef = useRef(0);

  const [subtitles,        setSubtitles]        = useState<SubtitleTrack[]>([]);
  const [streamingMovieId, setStreamingMovieId] = useState<number | null>(null);
  const [hlsUrl,           setHlsUrl]           = useState<string | null>(null);
  const [streamStatus,     setStreamStatus]     = useState<StreamStatus["status"]>("idle");
  const [streamError,      setStreamError]      = useState<string | null>(null);
  const [movieTitle,       setMovieTitle]       = useState("Loading movie...");
  const [subtitleOffsetSeconds, setSubtitleOffsetSeconds] = useState(0);

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
      } catch {
        setStreamError("Could not connect to the streaming server.");
      }
    }
    resolveMovie();
  }, [movieId]);

  // ── Step 2: poll stream status until ready ────────────────────────────────
  useEffect(() => {
    if (!streamingMovieId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const language = encodeURIComponent(preferredSubtitleLanguage());
        const res  = await fetch(`${API}/api/streaming/${streamingMovieId}/stream/?language=${language}`, {
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
  }, [streamingMovieId]);

  // ── Step 3: load subtitles once stream URL is known ───────────────────────
  // The backend triggers subtitle preparation as soon as the stream is ready,
  // so subtitles may not exist yet on the first request. Keep retrying for a
  // short bounded window so slower embedded extraction/external lookup can land.
  useEffect(() => {
    if (!streamingMovieId || !hlsUrl) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const retryForMs = 90_000;
    const retryEveryMs = 5_000;

    async function fetchSubtitles(): Promise<boolean> {
      try {
        const language = encodeURIComponent(preferredSubtitleLanguage());
        const res = await fetch(`${API}/api/streaming/${streamingMovieId}/subtitles/?language=${language}`, {
          credentials: "include",
        });
        if (!res.ok) return false;
        const tracks: SubtitleTrack[] = await res.json();
        if (cancelled) return tracks.length > 0;

        setSubtitles(
          tracks.map(track => ({
            ...track,
            src: normalizeBackendUrl(track.src),
          }))
        );
        return tracks.length > 0;
      } catch {
        return false;
      }
    }

    async function loadSubtitles() {
      const found = await fetchSubtitles();
      if (!found && !cancelled && Date.now() - startedAt < retryForMs) {
        retryTimer = setTimeout(loadSubtitles, retryEveryMs);
      }
    }

    loadSubtitles();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [streamingMovieId, hlsUrl]);

  // ── Step 4: attach HLS to <video> ────────────────────────────────────────
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

  function applySubtitleOffset(deltaSeconds: number) {
    const video = videoRef.current;
    if (!video || deltaSeconds === 0) return false;

    let shifted = false;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.mode !== "showing" || !track.cues) continue;

      for (let j = 0; j < track.cues.length; j++) {
        const cue = track.cues[j];
        cue.startTime = Math.max(0, cue.startTime + deltaSeconds);
        cue.endTime = Math.max(cue.startTime, cue.endTime + deltaSeconds);
        shifted = true;
      }
    }
    return shifted;
  }

  useEffect(() => {
    desiredSubtitleOffsetRef.current = subtitleOffsetSeconds;
    const delta = subtitleOffsetSeconds - appliedSubtitleOffsetRef.current;
    if (applySubtitleOffset(delta)) {
      appliedSubtitleOffsetRef.current = subtitleOffsetSeconds;
    }
  }, [subtitleOffsetSeconds]);

  // ── Step 5: activate first subtitle track once the VTT file is parsed ──────
  // The old approach used setTimeout(250) which raced with the browser's async
  // VTT fetch+parse. If the file wasn't parsed yet, setting mode="showing"
  // had no effect and the track appeared silent until the user toggled it off
  // and back on. We now use the TextTrackList `addtrack` event which fires once
  // the browser has registered the track, then wait for its `load` event before
  // setting the mode — guaranteeing cues are available when we activate it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || subtitles.length === 0) return;
    appliedSubtitleOffsetRef.current = 0;

    function activateFirstTrack() {
      // Disable all tracks, then enable the first one
      for (let i = 0; i < video!.textTracks.length; i++) {
        video!.textTracks[i].mode = i === 0 ? "showing" : "disabled";
      }
      window.requestAnimationFrame(() => {
        const delta = desiredSubtitleOffsetRef.current - appliedSubtitleOffsetRef.current;
        if (applySubtitleOffset(delta)) {
          appliedSubtitleOffsetRef.current = desiredSubtitleOffsetRef.current;
        }
      });
    }

    function onAddTrack(e: TrackEvent) {
      const track = e.track as TextTrack;
      if (!track) return;

      if (track.mode !== "disabled") return; // already handled

      // Wait for the VTT file to finish loading before activating
      const onLoad = () => activateFirstTrack();
      // TextTrack doesn't expose load events directly — listen via the
      // underlying HTMLTrackElement on the video
      const trackEl = Array.from(video!.querySelectorAll("track")).find(
        el => el.label === track.label && el.srclang === track.language
      );
      if (trackEl) {
        trackEl.addEventListener("load", onLoad, { once: true });
        // If already loaded (readyState 2), fire immediately
        if ((trackEl as HTMLTrackElement).readyState === 2) onLoad();
      } else {
        // No matching <track> element found — activate directly
        activateFirstTrack();
      }
    }

    video.textTracks.addEventListener("addtrack", onAddTrack);

    // Handle subtitles that were already added before this effect ran
    if (video.textTracks.length > 0) activateFirstTrack();

    return () => {
      video.textTracks.removeEventListener("addtrack", onAddTrack);
    };
  }, [subtitles]);

  return (
    <div className="min-h-screen flex flex-col items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15">
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

            {subtitles.length > 0 && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md bg-black/70 !p-2 text-xs text-white">
                <button
                  type="button"
                  onClick={() => setSubtitleOffsetSeconds(value => value - 1)}
                  className="rounded border border-white/20 !px-3 !py-1 hover:bg-white/10"
                >
                  -1s
                </button>
                <span className="min-w-10 text-center text-white/70">
                  {subtitleOffsetSeconds > 0 ? "+" : ""}{subtitleOffsetSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => setSubtitleOffsetSeconds(value => value + 1)}
                  className="rounded border border-white/20 !px-3 !py-1 hover:bg-white/10"
                >
                  +1s
                </button>
              </div>
            )}

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
