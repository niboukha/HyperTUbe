"use client";

import { Movie, MovieCard, normaliseTMDB } from "@/components/watchlist/watchlist-card";
/**
 * WatchlistPage
 *
 * Uses TMDB's /discover/movie as a stand-in for the real /api/movies.
 * Swap fetchMovies() → fetch('/api/movies?page='+page) when backend is ready.
 * normaliseTMDB maps every field to the canonical Movie type.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// ─── Genre map (TMDB IDs → names) ───────────────────────────────────────────

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
};

// ─── TMDB fetch (replace body with /api/movies for production) ───────────────

async function fetchMovies(page: number): Promise<Movie[]> {
  const url =
  `https://api.themoviedb.org/3/discover/movie` +
  `?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}` +
  `&language=en-US&page=${page}` +
  `&sort_by=popularity.desc&include_adult=false&vote_count.gte=100`;

  const data = await fetch(url).then((r) => r.json());
  console.log("Fetched movies page", page, data.results);

  return (data.results ?? []).map((r: any) => normaliseTMDB(r, GENRE_MAP));
}

// ─── Date grouping ───────────────────────────────────────────────────────────

function groupLabel(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 14) return "Last week";
  return "Earlier";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Saved state — keyed by movie id
  const [saved, setSaved] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("watchlist") ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("watchlist", JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Enrich movies with live saved state
  const hydrated = useMemo(
    () => movies.map((m) => ({ ...m, isSaved: saved.has(m.id) })),
    [movies, saved],
  );

  // Load next page
  const load = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const results = await fetchMovies(page);
      if (results.length === 0) { setDone(true); return; }
      // Attach a fake savedAt for grouping demo — remove when API provides it
      const stamped = results.map((m, i) => ({
        ...m,
        _savedAt: new Date(
          Date.now() - (i % 4) * 86_400_000 * Math.random() * 3,
        ).toISOString(),
      }));
      setMovies((p) => [...p, ...stamped as any]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, done, page]);

  // Initial load
  useEffect(() => { load(); }, []); // eslint-disable-line

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) load(); },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [load]);

  // Group by date label
  const grouped = useMemo(() => {
    const g: Record<string, (Movie & { _savedAt: string })[]> = {};
    const order: string[] = [];
    for (const m of hydrated as any[]) {
      const label = groupLabel(m._savedAt ?? new Date().toISOString());
      if (!g[label]) { g[label] = []; order.push(label); }
      g[label].push(m);
    }
    return { g, order };
  }, [hydrated]);

  return (
    <div className="min-h-screen flex flex-col gap-4 pb-16! overflow-x-hidden pt-18! px-5! md:px-13! lg:px-16!">

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-white/25 text-sm">{movies.length} titles</span>
      </div>

      {/* Groups */}
      {grouped.order.map((label) => (
        <section key={label} className="flex flex-col gap-3">
          {/* Section label */}
          <div className="flex items-center gap-3">
            <span className="text-accent-red font-title text-base leading-none">|</span>
            <span className="text-white/40 text-xs font-semibold tracking-[0.12em] uppercase">
              {label}
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {grouped.g[label].map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={loaderRef} className="flex justify-center py-6">
        {loading && (
          <div className="flex items-center gap-2 text-white/20 text-sm">
            <span className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            Loading more…
          </div>
        )}
        {done && movies.length > 0 && (
          <p className="text-white/15 text-xs tracking-wide">You ve reached the end</p>
        )}
      </div>
    </div>
  );
}