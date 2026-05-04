export async function GET() {
  // console.log("TMDB_KEY exists:", !!process.env.TMDB_KEY)

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/top_rated?api_key=${process.env.TMDB_KEY}&language=en-US&page=2&include_adult=false`
  )

  // console.log("TMDB response status:", res.status)

  const data = await res.json()

  console.log("TMDB data:", data)
  const BLOCKED_GENRES = new Set([10749, 27, 53])
  
  const results = (data.results ?? [])
    // .filter((r: any) => r.media_type === "movie" || r.media_type === "person")
    .filter((movie: any) => {
      if (!movie.genre_ids) return true

      return !movie.genre_ids.some((id: number) =>
        BLOCKED_GENRES.has(id)
      )
    })
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

    console.log("Enriched results:", results)


  return Response.json(results ?? [])
}