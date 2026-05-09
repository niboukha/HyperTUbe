import type { Movie, UserResult, MovieResult } from "@/types/search"

export const MOCK_USERS : UserResult[] = [
  {
    id: 1,
    username: "Tohn_doe",
    avatar: "avatars/Name=chicken.svg",
    "type": "user",
  },
  {
    id: 2,
    username: "Tinephile",
    avatar: "avatars/Name=fluffyblue.svg",
    "type": "user",
  },
  {
    id: 3,
    username: "Tovie_lover",
    avatar: "avatars/Name=red.svg",
    "type": "user",
  },
  {
    id: 4,
    username: "Cinephile42",
    avatar: "avatars/Name=green.svg",
    "type": "user",
  },
  {
    id: 5,
    username: "ReelCritic",
    avatar: "avatars/Name=yellow.svg",
    "type": "user",
  },
  {
    id: 6,
    username: "FilmGeek_Lila",
    avatar: "avatars/Name=blue.svg",
    "type": "user",
  },
]

export function mapTrendingToContinueWatching(tmdbMovies: Movie[] = []) {
  return tmdbMovies.map((movie: Movie) => {

    const progress = Math.floor(Math.random() * 85) + 10

    const durationMinutes = 90 + Math.floor(Math.random() * 90)
    const watchedMinutes = Math.floor((progress / 100) * durationMinutes)
    const remainingMinutes = durationMinutes - watchedMinutes
    // console.log(movie.year)
    return {
      id: movie.id,
      title: movie.title ?? "Untitled",
      overview: movie.overview || "No description available.",
      backdrop_path: movie.backdrop_path   ? `https://image.tmdb.org/t/p/w342${movie.backdrop_path}`   : null,
      poster_path: movie.poster_path   ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`   : null,
      
      rating: movie.rating,
      year: movie.year?.slice(0, 4),
      remainingTime:
        remainingMinutes > 60
            ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
            : `${remainingMinutes} min`,
      progress,
      availability: movie.availability ?? "premium",
    }
  })
}

export function mapToCards(results: Movie[]) {
  return results.map((movie) => {
    const imagePath = movie.backdrop_path ?? movie.poster_path

    return {
      id: movie.id,
      title: movie.title ?? "Untitled",
      backdrop_path: imagePath
        ? `https://image.tmdb.org/t/p/w780${imagePath}`
        : null,
      poster_path: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      overview: movie.overview ?? "No description available.",
      year: movie.release_date?.slice(0, 4) ?? "",
      rating: movie.rating,
      availability: movie.availability ?? "premium",
    }
  })
}
