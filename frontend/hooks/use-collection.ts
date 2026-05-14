"use client"

import { useEffect, useState } from "react"
import { MovieResult } from "@/types/search"

const API = "http://localhost:8000"

type CollectionData = {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  parts: MovieResult[]
} | null

export function useCollection(collectionId: number | null | undefined) {
  const [data,    setData]    = useState<CollectionData>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!collectionId) return

    setLoading(true)
    fetch(`${API}/movies/collection/${collectionId}/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [collectionId])

  return { data, loading }
}