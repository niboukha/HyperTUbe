export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")
  if (!q) return Response.json({ results: [] })

  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&api_key=${process.env.TMDB_KEY}&language=en-US&page=1`,
    { next: { revalidate: 300 } }
  )
  const data = await res.json()
  const BLOCKED_GENRES = new Set([10749, 27, 53])

  const results = (data.results ?? [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "person")
    .map((r: any) => ({
      type: r.media_type === "person" ? "user" : "movie",
      id: r.id,
      title: r.title || r.name,
      year: r.release_date?.slice(0, 4) || r.first_air_date?.slice(0, 4),
      rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
      poster_path: r.poster_path || r.profile_path,
      backdrop_path: r.backdrop_path,
      overview: r.overview,
      availability: Math.random() > 0.5 ? "free" : "premium",
      vote_count: r.vote_count,
    }))

  return Response.json( results ?? [] )
}
