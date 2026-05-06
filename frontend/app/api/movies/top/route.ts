import { TMDB_GENRE_MAP } from "@/constants/search-bar"

const BLOCKED_GENRE_IDS = new Set([10749, 18, 53, 99])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? 1)

  const res  = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_KEY}&language=en-US&page=${page}&include_adult=false`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()

  const results = (data.results ?? [])
    .filter((r: any) => r.poster_path && r.title)
    .filter((r: any) => !r.genre_ids?.some((id: number) => BLOCKED_GENRE_IDS.has(id)))
    .filter((r: any) => (r.vote_count ?? 0) >= 10)
    .map((r: any) => ({
      type:          "movie",
      id:            r.id,
      title:         r.title,
      year:          r.release_date?.slice(0, 4),
      rating:        r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
      poster_path:   r.poster_path,
      backdrop_path: r.backdrop_path,
      overview:      r.overview,
      availability:  Math.random() > 0.5 ? "free" : "premium",
      vote_count:    r.vote_count,
      genre:         (r.genre_ids ?? []).map((id: number) => TMDB_GENRE_MAP[Number(id)]).filter(Boolean),
    }))

  return Response.json({
    results,
    totalPages: data.total_pages ?? 1,
    page:       data.page ?? 1,
  })
}