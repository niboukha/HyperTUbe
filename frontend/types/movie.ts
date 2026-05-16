export type Genre = { id: number; name: string }

export type Collection = {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
} | null

export type CastMember = {
  id:           number
  name:         string
  character:    string
  profile_path: string | null
  order:        number
}

export type CrewMember = {
  id:           number
  name:         string
  job:          string
  profile_path: string | null
}

export type MovieDetail = {
  // identity
  id: string              // "tmdb-123" | "archive-AtlanticFlight"
  type: "movie"
  tmdb_id?: number
  archive_id?: string
  imdb_id?: string | null
  source: "tmdb" | "archive"
  availability: "premium" | "free"

  cast: CastMember[]
  crew: CrewMember[]

  // core
  title: string
  tagline: string
  overview: string
  year: string
  release_date: string | null
  runtime: string 

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
  languages: string[]

  // archive-only
  watch_url?: string
  director?: string
}