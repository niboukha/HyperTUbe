export async function GET() {
  // console.log("TMDB_KEY exists:", !!process.env.TMDB_KEY)

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/trending?api_key=${process.env.TMDB_KEY}&language=en-US&page=1`
  )

  // console.log("TMDB response status:", res.status)

  const data = await res.json()

  // console.log("TMDB data:", data)

  return Response.json(data.results ?? [])
}