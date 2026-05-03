export interface Movie {
  id: number
  title: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  popularity?: number
  release_date?: string
  original_language?: string
  original_title?: string
  adult?: boolean
  video?: boolean
  trailer?: string
  genre_ids?: number[]
  rating?: number
  availability?: "free" | "premium"
  year?: string
}


export interface User {
  id: number
  username: string
  avatar: string | null
}

export type SearchResult =
  | { type: "movie"; data: Movie }
  | { type: "user"; data: User }
  
export interface MovieCard {
  id: number
  title: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview: string
  year: string
  rating?: number
  vote_count?: number
  release_date?: string
  availability: "free" | "premium"
}
