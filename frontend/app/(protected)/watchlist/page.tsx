"use client";

import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { Movie, MovieCard, normaliseTMDB } from "@/components/watchlist/watchlist-card";
import { useEffect, useMemo, useState, useCallback } from "react";


const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror",
  9648: "Mystery", 878: "Sci-Fi", 10752: "War", 37: "Western",
};

async function fetchMovies(page: number): Promise<Movie[]> {
  const url =
    `https://api.themoviedb.org/3/discover/movie` +
    `?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}` +
    `&language=en-US` +
    `&page=${page}` +
    `&sort_by=popularity.desc` +
    `&include_adult=false` +
    `&include_video=false` +
    `&vote_count.gte=200` +
    `&vote_average.gte=6` +
    `&without_genres=27,10752,99,18,53` +
    `&with_original_language=en`;

  const data = await fetch(url, {
    next: { revalidate: 3600 },
  }).then((r) => r.json());

  // console.log("Fetched movies page", page, data.results);

  return (data.results ?? [])
    .filter(
      (movie: any) =>
        movie.poster_path &&
        movie.backdrop_path &&
        movie.overview &&
        movie.title &&

        // basic bad-word filtering
        !containsBadWords(movie.title) &&
        !containsBadWords(movie.overview)
    )
    .map((r: any) => normaliseTMDB(r, GENRE_MAP));
}

const blockedWords = [
  "sex",
  "porn",
  "nude",
  "nudity",
  "rape",
  "xxx",
  "erotic",
  "fetish",
  "kill",
  "bloody",
  "slaughter",
  "gore",
  "violence",
];

function containsBadWords(text: string = "") {
  const lower = text.toLowerCase();

  return blockedWords.some((word) => lower.includes(word));
}

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

export default function WatchlistPage() {
  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [hasMore,    setHasMore]    = useState(false);

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

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || hasMore) return;

    // first page loader
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const results = await fetchMovies(page);

      if (results.length === 0) {
        setHasMore(false);
        return;
      }

      const stamped = results.map((m, i) => ({
        ...m,
        _savedAt: new Date(
          Date.now() - (i % 4) * 86_400_000 * Math.random() * 3,
        ).toISOString(),
      }));

      setMovies((prev) => [...prev, ...(stamped as any)]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, loading, loadingMore, hasMore]);

  // useEffect(() => { loadMore(); }, []);

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
      <InfiniteScroll
        onLoadMore={loadMore}
        hasMore={hasMore}
        loading={loading}
        loadingMore={loadingMore}
      />
      
    </div>
  );
}