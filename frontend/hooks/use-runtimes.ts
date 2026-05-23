"use client"

import { useEffect, useState } from "react"

const API = "http://localhost:8000"
const RUNTIME_BATCH_SIZE = 50

function chunkIds(ids: string[]) {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += RUNTIME_BATCH_SIZE) {
    chunks.push(ids.slice(i, i + RUNTIME_BATCH_SIZE))
  }
  return chunks
}

export function useRuntimes(movieIds: string[]) {
  const [runtimes, setRuntimes] = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    let active = true
    const uniqueIds = Array.from(new Set(movieIds.filter(Boolean)))
    if (!uniqueIds.length) {
      Promise.resolve().then(() => {
        if (!active) return
        setRuntimes({})
        setLoading(false)
      })
      return () => { active = false }
    }

    // Stable key — only refetch if the set of ids actually changes
    const batches = chunkIds(uniqueIds)
    const controller = new AbortController()
    Promise.resolve().then(() => {
      if (active) setLoading(true)
    })

    Promise.all(
      batches.map(ids => (
        fetch(`${API}/movies/runtime/?ids=${encodeURIComponent(ids.join(","))}`, {
          signal: controller.signal,
        }).then(r => {
          if (!r.ok) throw new Error(`Runtime fetch failed: ${r.status}`)
          return r.json()
        })
      ))
    )
      .then(results => {
        if (!active) return
        setRuntimes(Object.assign({}, ...results))
        setLoading(false)
      })
      .catch(() => {
        if (active && !controller.signal.aborted) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [movieIds.join(",")]) // eslint-disable-line

  return { runtimes, loading }
}
