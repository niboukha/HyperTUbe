export const RECENT_SEARCHES_KEY = "hypertube_recent_searches"
export const MAX_RECENT = 5

export const TRENDING = [
  "Oppenheimer",
  "Dune: Part Two",
  "Poor Things",
  "Past Lives",
  "The Zone of Interest",
  "Killers of the Flower Moon",
]

// The lookup map for TMDB genre IDs → your display labels
export const TMDB_GENRE_MAP: Record<number, string> = {
  28:    "Action",
  878:   "Sci-Fi",
  27:    "Horror",
  35:    "Comedy",
  16:    "Animation",
  12:    "Adventure",
  14:    "Fantasy",
  80:    "Crime",
  9648:  "Mystery",
  99:    "Documentary",
  18:    "Drama",
  10751: "Family",
  36:    "History",
  10402: "Music",
  10749: "Romance",
  10752: "War",
  37:    "Western",
}

// The display list for the filter bar UI (what users see as chips)
export const GENRES = [
  "Action",
  "Sci-Fi",
  "Comedy",
  "Animation",
  "Adventure",
  "Fantasy",
  "Crime",
  "Mystery",
  "Family",
  "History",
]