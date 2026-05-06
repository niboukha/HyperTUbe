"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Play } from "lucide-react"
import { MovieResult } from "@/types/search"

export default function PrimeCard({ movie, active } : { movie: MovieResult, active: boolean }) {
  return (
    <div className="relative h-80 rounded-xl overflow-hidden bg-background">

      {/* IMAGE */}
      <Image
        src={`https://image.tmdb.org/t/p/w780${
          active ? movie.backdrop_path : movie.poster_path
        }`}
        alt={movie.title}
        fill
        className="object-cover transition-all duration-500"
      />

      {/* GRADIENT */}
      <motion.div
        animate={{ opacity: active ? 1 : 0.4 }}
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to right, rgba(0,0,0,0.9) 20%, transparent 70%),
            linear-gradient(to top, rgba(0,0,0,0.9) 10%, transparent 60%)
          `,
        }}
      />

      {/* CONTENT (ONLY WHEN ACTIVE) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: active ? 1 : 0,
          x: active ? 0 : -20,
        }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 p-4 w-[60%]"
      >
        <h3 className="text-white text-lg font-semibold">
          {movie.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
          <span>{movie.year}</span>
          <span>•</span>
          <span>⭐ {movie.rating ?? "N/A"}</span>

          <span
            className={`ml-2 px-2 py-0.5 rounded text-[10px] ${
              movie.availability === "free"
                ? "bg-blue-500 text-white"
                : "bg-yellow-400 text-background"
            }`}
          >
            {movie.availability}
          </span>
        </div>

        <p className="text-white/60 text-xs mt-2 line-clamp-2">
          {movie.overview}
        </p>

        <button className="mt-3 w-8 h-8 rounded-full bg-white flex items-center justify-center">
          <Play className="w-4 h-4 text-background fill-background ml-0.5" />
        </button>
      </motion.div>
    </div>
  )
}