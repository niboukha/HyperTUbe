import { cache } from "react"

const API = "http://backend:8000"

export const getMovies = cache(async (endpoint: string) => {  
  const res = await fetch(`${API}${endpoint}`, {
    next: { revalidate: 60 }
  })
  return res.json()
})

export const getMovieDetails = async (id: string) => {
    const res = await fetch(`${API}/movies/${id}/`)
    if (!res.ok) {
        return null
    }
    return res.json()
}
