
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

// {
//   "type": "movie",
//   "id": 12,
//   "title": "Inception",
//   "year": "2010",
//   "rating": 8.8,
//   "poster_path": "/xyz.jpg",
//   "backdrop_path": "/abc.jpg",
//   "overview": "...",
//   "release_date": "2010-07-16",
//   "availability": "free",
//   "genre": [28, 12]
// }

export type MovieResult = {
  type: "movie"
  id: string
  title: string
  year?: string
  rating?: number | null
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  release_date?: string
  availability: "free" | "premium"
  vote_count?: number
  genre?: number[]
  genre_ids?: number[]
}

export type UserResult = {
  type: "user"
  id: number
  username?: string
  avatar?: string
}

export type SearchResult =
  | { type: "movie"; data: MovieResult }
  | { type: "user"; data: UserResult }
  
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
