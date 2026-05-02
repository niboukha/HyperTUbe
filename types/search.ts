export interface Movie {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

export interface User {
  id: number
  username: string
  avatar: string | null
}

export type SearchResult =
  | { type: "movie"; data: Movie }
  | { type: "user"; data: User }
  