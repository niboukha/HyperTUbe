export interface Movie {
  id: number
  title: string
  overview: string
  backdrop_path: string | null
  poster_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  runtime?: number
  genres?: { id: number; name: string }[]
}