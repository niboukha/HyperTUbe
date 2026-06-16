"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { useLanguage } from "@/hooks/use-language"

export type HistoryItem = {
  id: string
  title: string
  overview: string
  backdrop_path: string | null
  poster_path: string | null
  genres: string[]
  release_date: string | null
  vote_average: number
  progress: number
  runtimeLeft: string | null
  status: "watching" | "completed" | null
}

export type HistoryGroup = {
  group: string
  items: HistoryItem[]
}

async function enrichGroups(groups: HistoryGroup[], langCode: string): Promise<HistoryGroup[]> {
  const allItems = groups.flatMap(g => g.items)
  if (allItems.length === 0) return groups

  const details = await Promise.all(
    allItems.map(item =>
      apiFetch(`/movies/${item.id}/`, { lang: langCode })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  )

  const detailMap = new Map(allItems.map((item, i) => [item.id, details[i]]))

  return groups.map(g => ({
    ...g,
    items: g.items.map(item => {
      const d = detailMap.get(item.id)
      if (!d) return item
      return {
        ...item,
        title:         d.title         || item.title,
        overview:      d.overview      || item.overview,
        backdrop_path: d.backdrop_path ?? item.backdrop_path,
        poster_path:   d.poster_path   ?? item.poster_path,
        vote_average:  d.rating        ?? item.vote_average,
      }
    }),
  }))
}

export function useHistory() {
  const { langCode, langReady } = useLanguage()
  const [groups,  setGroups]  = useState<HistoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!langReady) return
    let cancelled = false
    setLoading(true)
    setError(false)

    apiFetch("/history/", { lang: langCode })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: HistoryGroup[]) => enrichGroups(data, langCode))
      .then((enriched: HistoryGroup[]) => {
        if (!cancelled) setGroups(enriched)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [langCode, langReady])

  const removeItem = useCallback(async (movieId: string) => {
    setGroups(prev =>
      prev
        .map(g => ({ ...g, items: g.items.filter(i => i.id !== movieId) }))
        .filter(g => g.items.length > 0)
    )
    try {
      await apiFetch(`/history/${movieId}/`, { method: "DELETE" })
    } catch {}
  }, [])

  const isEmpty = !loading && !error && groups.length === 0

  return { groups, loading, error, isEmpty, removeItem }
}
