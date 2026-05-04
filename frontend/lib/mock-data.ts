import type { Movie, UserResult, SearchResult } from "@/types/search"

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

export const continueWatchingMovies = [
  {
    id: 1,
    title: "Dune: Part Two",
    progress: 46,
    image: "https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    duration: "2h 46m",
    remainingTime: "25m",
  },
  {
    id: 2,
    title: "Deadpool & Wolverine",
    progress: 64,
    image: "https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    duration: "2h 07m",
    remainingTime: "1h 23m",
  },
  {
    id: 3,
    title: "Inside Out 2",
    progress: 24,
    image: "https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
    duration: "1h 36m",
    remainingTime: "1h 23m",
  },
  {
    id: 4,
    title: "Oppenheimer",
    progress: 11,
    image: "https://image.tmdb.org/t/p/w780/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    duration: "3h 00m",
    remainingTime: "1h 44m",
  },
  {
    id: 5,
    title: "Barbie",
    progress: 99,
    image: "https://image.tmdb.org/t/p/w780/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    duration: "1h 54m",
    remainingTime: "2m",
  },
  {
    id: 6,
    title: "The Batman",
    progress: 89,
    image: "https://image.tmdb.org/t/p/w780/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    duration: "2h 56m",
    remainingTime: "25m",
  },
  {
    id: 7,
    title: "Godzilla x Kong: The New Empire",
    progress: 88,
    image: "https://image.tmdb.org/t/p/w780/1N7terrMeZPwK5qq31MUD0HQ3IG.jpg",
    duration: "1h 55m",
    remainingTime: "25m",
  },
  {
    id: 8,
    title: "The Marvels",
    progress: 6,
    image: "https://image.tmdb.org/t/p/w780/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg",
    duration: "1h 45m",
    remainingTime: "25m",
  },
  {
    id: 9,
    title: "Spider-Man: No Way Home",
    progress: 44,
    image: "https://image.tmdb.org/t/p/w780/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    duration: "2h 28m",
    remainingTime: "25m",
  },
  {
    id: 10,
    title: "Avatar: The Way of Water",
    progress: 7,
    image: "https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    duration: "3h 12m",
    remainingTime: "25m",
  },
];


export function mapTrendingToContinueWatching(tmdbMovies: Movie[] = []) {
  return tmdbMovies.map((movie: Movie) => {

    const progress = Math.floor(Math.random() * 85) + 10

    const durationMinutes = 90 + Math.floor(Math.random() * 90)
    const watchedMinutes = Math.floor((progress / 100) * durationMinutes)
    const remainingMinutes = durationMinutes - watchedMinutes
    const imagePath = movie.backdrop_path ?? movie.poster_path
    
    return {
      id: movie.id,
      title: movie.title ?? "Untitled",
      overview: movie.overview || "No description available.",
      backdrop_path: imagePath
        ? `https://image.tmdb.org/t/p/w780${imagePath}`
        : "/placeholder.jpg",
      progress,

      duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,

      remainingTime:
        remainingMinutes > 60
          ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
          : `${remainingMinutes} min`,

      rating: movie.vote_average
        ? Number(movie.vote_average.toFixed(1))
        : undefined,

      year: movie.release_date ? movie.release_date.slice(0, 4) : "Unknown",
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
        : "/placeholder.jpg",
      poster_path: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      overview: movie.overview ?? "No description available.",
      year: movie.release_date?.slice(0, 4) ?? "",
      rating: movie.vote_average
        ? Number(movie.vote_average.toFixed(1))
        : undefined,
      availability: movie.availability ?? "premium",

    }
  })
}