// export interface Movie {
//   id: number
//   title: string
//   overview: string
//   backdrop_path: string | null
//   poster_path: string | null
//   vote_average: number
//   vote_count: number
//   release_date: string
//   runtime?: number
//   genres?: { id: number; name: string }[]
// }


// types/movie.ts

export type Genre = { id: number; name: string }

export type Collection = {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
} | null

export type MovieDetail = {
  // identity
  id: string              // "tmdb-123" | "archive-AtlanticFlight"
  type: "movie"
  tmdb_id?: number
  archive_id?: string
  imdb_id?: string | null
  source: "tmdb" | "archive"
  availability: "premium" | "free"

  // core
  title: string
  original_title: string
  tagline: string
  overview: string
  year: string
  release_date: string | null
  runtime: string 
  runtime_mins: number | null
  status: string | null

  // media
  poster_path: string | null
  backdrop_path: string | null

  // ratings
  rating: number
  vote_count: number
  popularity: number | null

  // genres
  genres: Genre[]
  genre_ids: number[]

  // production
  collection: Collection
  studios: string[]
  countries: string[]
  languages: string[]
  budget: number | null
  revenue: number | null
  homepage: string | null

  // archive-only (optional)
  watch_url?: string
  director?: string
  license?: string
  color?: string
  sound?: string
  subjects?: string[]
}