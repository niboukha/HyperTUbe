// hooks/use-runtimes.ts
"use client"

import { useEffect, useState } from "react"

const API = "http://localhost:8000"

export function useRuntimes(movieIds: string[]) {
  const [runtimes, setRuntimes] = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!movieIds.length) return

    // Stable key — only refetch if the set of ids actually changes
    const ids = movieIds.join(",")
    setLoading(true)

    fetch(`${API}/movies/runtime/?ids=${encodeURIComponent(ids)}`)
      .then(r => r.json())
      .then(data => { setRuntimes(data); setLoading(false) })
      .catch(()  => setLoading(false))
  }, [movieIds.join(",")]) // eslint-disable-line

  return { runtimes, loading }
}