"use client";

import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { Movie, MovieCard, normaliseTMDB } from "@/components/watchlist/watchlist-card";
import { useMemo, useState, useCallback, useEffect } from "react";
import { syncCacheRemove } from "@/hooks/use-watchlist-toggle";
import { useLanguage } from "@/hooks/use-language";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "next-intl";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror",
  9648: "Mystery", 878: "Sci-Fi", 10752: "War", 37: "Western",
};

function getGroupLabel(iso: string, t: ReturnType<typeof useTranslations<"Watchlist">>): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86_400_000,
  );
  if (diff === 0) return t("today");
  if (diff === 1) return t("yesterday");
  if (diff < 7)  return t("daysAgo", { count: diff });
  if (diff < 14) return t("lastWeek");
  return t("earlier");
}

export default function WatchlistPage() {
  const [movies,  setMovies]  = useState<(Movie & { _savedAt: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { langCode } = useLanguage();
  const t = useTranslations("Watchlist");

  useEffect(() => {
    setLoading(true);
    setMovies([]);
    apiFetch("/watchlist/", { lang: langCode })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const items = (data.items ?? []).map((entry: any) =>
          ({
            ...normaliseTMDB(
              {
                id:           entry.movie_id.replace(/^tmdb-/, ""),
                title:        entry.title,
                poster_path:  entry.poster_path,
                release_date: entry.year ? `${entry.year}-01-01` : undefined,
                vote_average: entry.rating ?? 0,
                overview:     entry.overview ?? "",
                backdrop_path: entry.backdrop_path ?? "",
                availability: entry.movie_id.startsWith("tmdb-") ? "premium" : "free",
              },
              GENRE_MAP,
            ),
            id:       entry.movie_id,
            isSaved:  true,
            _savedAt: entry.added_at ?? new Date().toISOString(),
          })
        );
        setMovies(items);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [langCode]);

  const toggleSave = useCallback((id: string) => {
    setMovies(prev => prev.filter(m => m.id !== id));
    syncCacheRemove(id);
    fetch(`${API}/watchlist/toggle/`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ movie_id: id }),
    }).catch(() => {});
  }, []);

  // Group by date label
  const grouped = useMemo(() => {
    const g: Record<string, (Movie & { _savedAt: string })[]> = {};
    const order: string[] = [];
    for (const m of movies) {
      const label = getGroupLabel(m._savedAt ?? new Date().toISOString(), t);
      if (!g[label]) { g[label] = []; order.push(label); }
      g[label].push(m);
    }
    return { g, order };
  }, [movies, t]);

  return (
    <div className="min-h-screen flex flex-col gap-4 pb-16! overflow-x-hidden pt-18! px-5! md:px-13! lg:px-16!">

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-white/25 text-sm">{t("titles", { count: movies.length })}</span>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-md bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-32">
          <span className="text-white/40 text-4xl">🎬</span>
          <p className="text-white/40 text-sm">{t("empty")}</p>
          <p className="text-white/25 text-xs">{t("hint")}</p>
        </div>
      )}

      {/* Groups */}
      {!loading && grouped.order.map((label) => (
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

    </div>
  );
}
