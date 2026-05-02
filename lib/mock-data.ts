import type { Movie, User, SearchResult } from "@/types/search"

export const mockMovies: Movie[] = [
  {
    id: 1,
    title: "The Walking Dead",
    release_date: "2010-07-16",
    poster_path: "posters/the-walking-dead.jpeg",
  },
  {
    id: 2,
    title: "Trom",
    release_date: "2014-11-07",
    poster_path: "posters/from.jpeg",
  },
  {
    id: 3,
    title: "Tarry Potter",
    release_date: "2008-07-18",
    poster_path: "posters/harryPotter.jpeg",
  },
]

export const mockUsers: User[] = [
  {
    id: 1,
    username: "Tohn_doe",
    avatar: "avatars/Name=chicken.svg",
  },
  {
    id: 2,
    username: "Tinephile",
    avatar: "avatars/Name=fluffyblue.svg",
  },
  {
    id: 3,
    username: "Tovie_lover",
    avatar: "avatars/Name=red.svg",
  },
]

export function searchMock(query: string): SearchResult[] {
  if (!query) return []

  const q = query.toLowerCase()

  const movieResults: SearchResult[] = mockMovies
    .filter((m) => m.title.toLowerCase().includes(q))
    .map((m) => ({ type: "movie", data: m }))

  const userResults: SearchResult[] = mockUsers
    .filter((u) => u.username.toLowerCase().includes(q))
    .map((u) => ({ type: "user", data: u }))

  return [...userResults, ...movieResults] // users first (nice UX)
}

export const continueWatchingMovies = [
  {
    id: 1,
    title: "The Dark Knight",
    progress: 78,
    image: "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    duration: "2h 32m",
    remainingTime: "33 min left",
  },
  {
    id: 2,
    title: "Inception",
    progress: 62,
    image: "https://image.tmdb.org/t/p/w780/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    duration: "2h 28m",
    remainingTime: "56 min left",
  },
  {
    id: 3,
    title: "Interstellar",
    progress: 45,
    image: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    duration: "2h 49m",
    remainingTime: "1h 32m left",
  },
  {
    id: 4,
    title: "The Shawshank Redemption",
    progress: 85,
    image: "https://image.tmdb.org/t/p/w780/9O7gLzmreU0nGkIB6K3BsJbzvNv.jpg",
    duration: "2h 22m",
    remainingTime: "21 min left",
  },
  {
    id: 5,
    title: "Fight Club",
    progress: 40,
    image: "https://image.tmdb.org/t/p/w780/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg",
    duration: "2h 19m",
    remainingTime: "1h 18m left",
  },
  {
    id: 6,
    title: "The Godfather",
    progress: 55,
    image: "https://image.tmdb.org/t/p/w780/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    duration: "2h 55m",
    remainingTime: "1h 18m left",
  },
  {
    id: 7,
    title: "Pulp Fiction",
    progress: 33,
    image: "https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    duration: "2h 34m",
    remainingTime: "1h 42m left",
  },
  {
    id: 8,
    title: "Dune: Part Two",
    progress: 71,
    image: "https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    duration: "2h 46m",
    remainingTime: "48 min left",
  },
  {
    id: 9,
    title: "The Batman",
    progress: 88,
    image: "https://image.tmdb.org/t/p/w780/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    duration: "2h 56m",
    remainingTime: "21 min left",
  },
  {
    id: 10,
    title: "Parasite",
    progress: 52,
    image: "https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    duration: "2h 12m",
    remainingTime: "1h 01m left",
  },
]

const IMAGE_BASE = "https://image.tmdb.org/t/p/w780"

export function mapTrendingToContinueWatching(tmdbMovies: any[]) {
  return tmdbMovies.map((movie: any, index: number) => {
    const title = movie.title || movie.name || "Unknown Title"

    // simulate realistic watch progress (Netflix-like behavior)
    const progress = Math.floor(Math.random() * 85) + 10 // 10–95%

    const durationMinutes = 90 + Math.floor(Math.random() * 90) // 1h30–3h
    const watchedMinutes = Math.floor((progress / 100) * durationMinutes)
    const remainingMinutes = durationMinutes - watchedMinutes

    return {
      id: movie.id,
      title,
      overview: movie.overview,
      image: movie.backdrop_path
        ? `${IMAGE_BASE}${movie.backdrop_path}`
        : movie.poster_path
        ? `${IMAGE_BASE}${movie.poster_path}`
        : "/placeholder.jpg",

      progress,

      duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,

      remainingTime:
        remainingMinutes > 60
          ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m left`
          : `${remainingMinutes} min left`,

      rating: movie.vote_average,
    }
  })
}
