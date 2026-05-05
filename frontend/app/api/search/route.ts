import { TMDB_GENRE_MAP } from "@/constants/search-bar"

const BLOCKED_GENRE_IDS  = new Set([10749, 18, 53])
const ADULT_KEYWORDS     = /\b(xxx|porn|erotic|sex|adult|nude|naked|hentai)\b/i
const MIN_VOTE_COUNT     = 10
const MIN_POPULARITY     = 2

function isQualityMovie(r: any): boolean {
  if (!r.poster_path) return false
  if (!r.title && !r.name) return false
  if (ADULT_KEYWORDS.test(r.title || r.name || "")) return false
  if ((r.vote_count ?? 0) < MIN_VOTE_COUNT) return false
  if ((r.popularity ?? 0) < MIN_POPULARITY) return false
  return true 
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get("q")
  const page   = Number(searchParams.get("page") ?? 1)
  const genre  = searchParams.get("genre") // genre name e.g. "Action"

  // Reverse lookup genre name → TMDB id
  const genreId = genre
    ? Object.entries(TMDB_GENRE_MAP).find(([, name]) => name.toLowerCase() === genre.toLowerCase())?.[0]
    : null

  let results: any[] = []
  let totalPages = 1

  if (q) {
    // Text search — optionally filtered by genre client-side
    const res  = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&api_key=${process.env.TMDB_KEY}&language=en-US&page=${page}&include_adult=false`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    results    = data.results ?? []
    totalPages = data.total_pages ?? 1
  } else if (genreId) {
    // Genre browse — use discover endpoint
    const res  = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_KEY}&language=en-US&page=${page}&include_adult=false&with_genres=${genreId}&sort_by=popularity.desc`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    results    = data.results?.map((r: any) => ({ ...r, media_type: "movie" })) ?? []
    totalPages = data.total_pages ?? 1
  } else {
    return Response.json({ results: [], totalPages: 0 })
  }

  const mapped = results
    .filter((r: any) => r.media_type === "movie" || r.media_type === "person")
    .filter((r: any) => !r.genre_ids?.some((id: number) => BLOCKED_GENRE_IDS.has(id)))
    .filter(isQualityMovie)
    .map((r: any) => ({
      type:          "movie",
      id:            r.id,
      title:         r.title || r.name,
      year:          r.release_date?.slice(0, 4),
      rating:        r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
      poster_path:   r.poster_path,
      backdrop_path: r.backdrop_path,
      overview:      r.overview,
      availability:  Math.random() > 0.5 ? "free" : "premium",
      vote_count:    r.vote_count,
      genre:         (r.genre_ids ?? []).map((id: number) => TMDB_GENRE_MAP[Number(id)]).filter(Boolean),
    }))

  return Response.json({ results: mapped, totalPages, page })
}