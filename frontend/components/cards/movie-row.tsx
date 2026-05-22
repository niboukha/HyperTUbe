"use client"

import { useEffect, useState } from "react"
import { MovieCard } from "./movie-card"

interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface MovieRowProps {
  title: string
  endpoint: string
}

export function MovieRow({ title, endpoint }: MovieRowProps) {
  const [movies, setMovies] = useState<Movie[]>([])

  useEffect(() => {
    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data: Movie[]) => setMovies(data))
      .catch(err => console.error("MovieRow fetch error:", err))
  }, [endpoint])

  // console.log(`Fetched movies for ${title}:`, movies)

  if (movies.length === 0) {
    return (
      <div className="px-6 md:px-12 lg:px-16 py-6">
        <h2 className="text-white text-xl font-bold mb-4">{title}</h2>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[140px] md:w-[160px] aspect-[2/3] bg-[#1a1a1a] rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-12 lg:px-16 py-6">
      <h2 className="text-white text-xl font-bold mb-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            title={movie.title}
            posterPath={movie.poster_path}
            year={
              movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : "N/A"
            }
          />
        ))}
      </div>
    </div>
  )
}