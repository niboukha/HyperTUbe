import { NextRequest, NextResponse } from "next/server"

const TMDB_BASE = "https://api.themoviedb.org/3"
const API_KEY = process.env.TMDB_KEY

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!API_KEY) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 500 }
      )
    }

    const res = await fetch(
      `${TMDB_BASE}/movie/${id}?api_key=${API_KEY}&language=en-US`,
      {
        cache: "force-cache",
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error("TMDB ERROR:", text)

      return NextResponse.json(
        { error: "Failed to fetch movie" },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      id: data.id,
      title: data.title,
      runtime: data.runtime,
      genres: data.genres?.map((g: { name: string }) => g.name) ?? [],
      overview: data.overview,
      release_date: data.release_date,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    )
  }
}