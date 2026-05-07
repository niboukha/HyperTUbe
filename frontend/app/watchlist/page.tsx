"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Check } from "lucide-react";

type Movie = {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: number;
  duration: string;
  genres: string[];
  status: "free" | "premium";
  createdAt: string;
};

function formatGroup(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "TODAY";
  if (diff === 1) return "YESTERDAY";
  return "EARLIER";
}

function MovieCard({ movie, saved, onToggle }: any) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.03 }}
      className="relative rounded-xl overflow-hidden bg-[#141416] shadow-xl cursor-pointer group"
    >
      {/* IMAGE */}
      <div className="relative aspect-[16/9]">
        <img
          src={movie.backdrop}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

        {/* PLAY ICON */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full">
            <Play className="text-white" />
          </div>
        </div>

        {/* FREE BADGE */}
        <div className="absolute top-2 right-2">
          <span className="bg-green-500 text-black text-[10px] px-2 py-1 rounded font-bold">
            {movie.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-3">
        {/* TITLE */}
        <h3 className="text-white font-extrabold tracking-widest text-sm">
          {movie.title}
        </h3>

        {/* ACTION ROW */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onToggle(movie)}
            className={`p-1 rounded ${saved ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            <Check size={14} />
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="text-yellow-400 font-bold">IMDb {movie.rating}</span>
            <span>{movie.year}</span>
            <span>{movie.duration}</span>
          </div>
        </div>

        {/* GENRES */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {movie.genres.map((g: string) => (
            <span
              key={g}
              className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-gray-300"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function WatchlistPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  const loader = useRef(null);

  // local saved state
  useEffect(() => {
    const s = localStorage.getItem("watchlist");
    if (s) setSaved(JSON.parse(s));
  }, []);

  const toggleSave = (movie: Movie) => {
    setSaved((prev) => {
      const exists = prev.includes(movie.id);
      const updated = exists
        ? prev.filter((id) => id !== movie.id)
        : [...prev, movie.id];

      localStorage.setItem("watchlist", JSON.stringify(updated));
      return updated;
    });
  };

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const res = await fetchMovies(page);
    setMovies((p) => [...p, ...res.results]);

    setPage((p) => p + 1);
    setLoading(false);
  }, [page, loading]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) load();
    });

    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [load]);

  const grouped = useMemo(() => {
    const g: Record<string, Movie[]> = {};
    movies.forEach((m) => {
      const key = formatGroup(m.createdAt);
      if (!g[key]) g[key] = [];
      g[key].push(m);
    });
    return g;
  }, [movies]);

  return (
    <div className="min-h-screen flex flex-col gap-4 pb-16! overflow-x-hidden pt-18! px-5! md:px-13! lg:px-16!">

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="mb-10">
          <h2 className="text-gray-400 text-xs mb-3 tracking-widest">
            {section}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                saved={saved.includes(m.id)}
                onToggle={toggleSave}
              />
            ))}
          </div>
        </div>
      ))}

      {loading && <div className="text-center text-gray-500">Loading...</div>}

      <div ref={loader} className="h-10" />
    </div>
  );
}
