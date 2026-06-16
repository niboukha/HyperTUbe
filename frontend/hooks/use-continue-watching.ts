"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { useLanguage } from "@/hooks/use-language"
import { type HistoryGroup } from "@/hooks/use-history"

export type ContinueWatchingItem = {
  id: string
  title: string
  progress: number
  backdrop_path: string | null
  poster_path: string | null
  runtimeLeft: string | null
  release_date: string | null
  vote_average: number
}

async function enrichItems(items: ContinueWatchingItem[], langCode: string): Promise<ContinueWatchingItem[]> {
  if (items.length === 0) return items
  const details = await Promise.all(
    items.map(item =>
      apiFetch(`/movies/${item.id}/`, { lang: langCode })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  )
  return items.map((item, i) => {
    const d = details[i]
    if (!d) return item
    return {
      ...item,
      title:         d.title         || item.title,
      backdrop_path: d.backdrop_path ?? item.backdrop_path,
      poster_path:   d.poster_path   ?? item.poster_path,
      vote_average:  d.rating        ?? item.vote_average,
    }
  })
}

export function useContinueWatching() {
  const { langCode, langReady } = useLanguage()
  const [items,   setItems]   = useState<ContinueWatchingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!langReady) return
    let cancelled = false
    setLoading(true)

    apiFetch("/history/", { lang: langCode })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: HistoryGroup[]) => {
        const flat = data
          .flatMap(g => g.items)
          .filter(item => (item as any).status === "watching" && item.progress > 0 && item.progress < 95)
          .slice(0, 15)
        return enrichItems(flat as unknown as ContinueWatchingItem[], langCode)
      })
      .then(enriched => { if (!cancelled) setItems(enriched) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [langCode, langReady])

  return { items, loading }
}
