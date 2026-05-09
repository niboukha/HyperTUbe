import { NextRequest } from "next/server"

const TMDB_BASE = "https://api.themoviedb.org/3"
const API_KEY   = process.env.TMDB_KEY

// Preset endpoints that don't need discover
const PRESET_ENDPOINTS: Record<string, string> = {
  trending: "/trending/movie/week",
  now:      "/movie/now_playing",
  upcoming: "/movie/upcoming",
}

// Blocked genre IDs (romance, horror, thriller)
const BLOCKED_GENRES = new Set([10749, 18, 53, 99])

export async function GET(req: NextRequest) {
  const s           = req.nextUrl.searchParams
  const type        = s.get("type") ?? "popular"
  const genre       = s.get("genre")       // e.g. "28" (genre ID directly)
  const minRating   = s.get("minRating")   // e.g. "7"
  const yearFrom    = s.get("yearFrom")    // e.g. "2010"
  const yearTo      = s.get("yearTo")      // e.g. "2024"
  const sort        = s.get("sort")        // popularity.desc | vote_average.desc | etc.
  const page        = s.get("page")        // e.g. "1"
  const q           = s.get("q")           // text search

  // ── Text search ──────────────────────────────────────────────────────────
  if (q) {
    const url = new URL(`${TMDB_BASE}/search/movie`)
    url.searchParams.set("api_key",       API_KEY!)
    url.searchParams.set("query",         q)
    url.searchParams.set("page",          page ?? "1")
    url.searchParams.set("language",      "en-US")
    url.searchParams.set("include_adult", "false")

    const data = await tmdbFetch(url, 60) // short cache for search
    return respond(data, BLOCKED_GENRES)
  }

  // ── Preset endpoints (trending, now_playing, upcoming) ───────────────────
  // These don't support discover filters so we hit them directly
  if (PRESET_ENDPOINTS[type] && !genre && !minRating && !yearFrom) {
    const url = new URL(`${TMDB_BASE}${PRESET_ENDPOINTS[type]}`)
    url.searchParams.set("api_key",       API_KEY!)
    url.searchParams.set("page",          page ?? "1")
    url.searchParams.set("language",      "en-US")
    url.searchParams.set("include_adult", "false")

    const data = await tmdbFetch(url, 3600)
    return respond(data, BLOCKED_GENRES)
  }

  // ── Discover — ALL filters pushed server-side ─────────────────────────────
  const url = new URL(`${TMDB_BASE}/discover/movie`)
  url.searchParams.set("api_key",       API_KEY!)
  url.searchParams.set("language",      "en-US")
  url.searchParams.set("include_adult", "false")
  url.searchParams.set("page",          page ?? "1")

  // Block unwanted genres globally
  url.searchParams.set(
    "without_genres",
    [...BLOCKED_GENRES].join(",")
  )

  // Sort
  url.searchParams.set(
    "sort_by",
    sort ?? (type === "top" ? "vote_average.desc" : "popularity.desc")
  )

  // Extra safety for top rated: require minimum vote count
  if (type === "top") {
    url.searchParams.set("vote_count.gte", "300")
  }

  // Genre filter
  if (genre) url.searchParams.set("with_genres", genre)

  // Rating filter
  if (minRating) url.searchParams.set("vote_average.gte", minRating)

  // Year range
  if (yearFrom) url.searchParams.set("primary_release_date.gte", `${yearFrom}-01-01`)
  if (yearTo)   url.searchParams.set("primary_release_date.lte", `${yearTo}-12-31`)

  const data = await tmdbFetch(url, 3600)
  return respond(data, BLOCKED_GENRES)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function tmdbFetch(url: URL, revalidate: number) {
  const res = await fetch(url.toString(), {
    next: { revalidate },
  })
  if (!res.ok) {
    console.error("TMDB error", res.status, url.toString())
    return { results: [], total_pages: 1, total_results: 0 }
  }
  return res.json()
}

function respond(data: any, blockedGenres: Set<number>) {
  const raw: any[] = data.results ?? []

  // Light client-side block for presets that don't support without_genres
  const filtered = raw.filter(
    (m) => !m.genre_ids?.some((id: number) => blockedGenres.has(id))
  )
  filtered.map((m) => {
    console.log("movies:", JSON.stringify(m, null, 2))
  })
  
  const results = filtered.map((m) => ({
    id:           m.id,
    title:        m.title,
    overview:     m.overview,
    year:         m.release_date?.slice(0, 4) ?? "",
    rating:       m.vote_average ? Number(m.vote_average.toFixed(1)) : null,
    genre:        m.genre_ids ?? [],
    poster_path:       m.poster_path   ? `https://image.tmdb.org/t/p/w342${m.poster_path}`   : null,
    backdrop_path:     m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
    availability: "premium" as const,
    type:         "movie" as const,

  }))

  return Response.json({
    results,
    totalPages:   Math.min(data.total_pages ?? 1, 500), // TMDB caps at 500
    totalResults: data.total_results ?? 0,
  })
}

