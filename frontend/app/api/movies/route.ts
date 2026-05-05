import { TMDB_GENRE_LABELS } from "@/lib/tmdb-genres"
import { Movie } from "@/types/search"

const TMDB_BASE = "https://api.themoviedb.org/3"
const API_KEY = process.env.TMDB_KEY

const GENRE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(TMDB_GENRE_LABELS).map(([id, name]) => [name.toLowerCase(), Number(id)])
)

const ENDPOINTS: Record<string, string> = {
  trending: "/trending/movie/week",
  popular:  "/movie/popular",
  top:      "/movie/top_rated",
  now:      "/movie/now_playing",
  upcoming: "/movie/upcoming",
}

async function checkFreeAvailability(title: string, year: string): Promise<boolean> {
  try {
    const query = encodeURIComponent(`${title} ${year}`)
    const res = await fetch(
      `https://archive.org/advancedsearch.php?q=${query}&fl=identifier,title&rows=1&output=json`,
      { next: { revalidate: 86400 } }
    )
    const data = await res.json()
    return (data?.response?.numFound ?? 0) > 0
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type  = searchParams.get("type")  || "trending"
  const genre = searchParams.get("genre")

  let tmdbUrl: string

  if (genre) {
    const genreId = GENRE_NAME_TO_ID[genre.toLowerCase()]
    if (!genreId) return Response.json({ error: `Unknown genre: ${genre}` }, { status: 400 })
    tmdbUrl = `${TMDB_BASE}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&api_key=${API_KEY}&language=en-US&include_adult=false`
  } else {
    const path = ENDPOINTS[type] ?? ENDPOINTS.trending
    tmdbUrl = `${TMDB_BASE}${path}?api_key=${API_KEY}&language=en-US&include_adult=false`
  }

  const tmdbRes = await fetch(tmdbUrl, { next: { revalidate: 3600 } })
  const tmdbData = await tmdbRes.json()

  if (!tmdbRes.ok) {
    console.error("TMDB error:", tmdbData)
    return Response.json({ results: [] }, { status: tmdbRes.status })
  }
  
  const movies = tmdbData.results ?? []

  const BLOCKED_GENRES = new Set([10749, 27, 53])
  const filtredmovies = movies.filter((movie: any) => {
      if (!movie.genre_ids) return true

      return !movie.genre_ids.some((id: number) =>
        BLOCKED_GENRES.has(id)
      )
    })
    
  const enriched = await Promise.all(
    filtredmovies.map(async (movie: Movie) => {
      const year = movie.release_date?.slice(0, 4) ?? ""
      const isFree = await checkFreeAvailability(movie.title, year)
      return {
        ...movie,
        year,
        rating: movie.vote_average
          ? Number(movie.vote_average.toFixed(1))
          : undefined,
        availability: isFree ? "free" : "premium",
        poster: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,

        backdrop: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
          : null,
      }
    })
  )


  return Response.json({ results: enriched })
}