import { cache } from "react"

export const getMovies = cache(async (endpoint: string) => {
  console.log(`----------Fetching movies from endpoint: ${endpoint}`)
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    next: { revalidate: 60 }
  })
  return res.json()
})

export const getMovieDetails = async (id: string) => {
  
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/${id}/`)
    if (!res.ok) {
        return null
    }


    return res.json()
}
