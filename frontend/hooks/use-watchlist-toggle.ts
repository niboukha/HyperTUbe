"use client"

import { useState, useEffect, useCallback } from "react"
import { MovieResult } from "@/types/search"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Module-level cache — all hook instances share one request
let _ids: Set<string> | null = null
let _pending: Promise<Set<string>> | null = null
const _subs = new Set<() => void>()

function notify() { _subs.forEach(fn => fn()) }

async function fetchIds(): Promise<Set<string>> {
  if (_ids !== null) return _ids
  if (_pending) return _pending
  _pending = fetch(`${API}/watchlist/`, { credentials: "include" })
    .then(r => r.ok ? r.json() : { items: [] })
    .then(data => {
      _ids = new Set((data.items ?? []).map((i: { movie_id: string }) => String(i.movie_id)))
      _pending = null
      return _ids
    })
    .catch(() => { _pending = null; _ids = new Set(); return _ids! })
  return _pending
}

function invalidate() { _ids = null }

export function syncCacheRemove(movieId: string) {
  if (_ids) _ids.delete(String(movieId))
  notify()
}

export function useWatchlistToggle(movie: Pick<MovieResult, "id" | "title" | "poster_path" | "year" | "rating" | "genre_ids" | "overview" | "backdrop_path">) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(false)

  // Subscribe to cache updates and read initial state
  useEffect(() => {
    let mounted = true
    const refresh = () => {
      if (mounted && _ids) setInWatchlist(_ids.has(String(movie.id)))
    }
    _subs.add(refresh)
    fetchIds().then(() => { if (mounted) refresh() })
    return () => { _subs.delete(refresh); mounted = false }
  }, [movie.id])

  const toggle = useCallback(async () => {
    if (loading) return
    // Optimistic update
    const next = !inWatchlist
    setInWatchlist(next)
    setLoading(true)
    try {
      const res = await fetch(`${API}/watchlist/toggle/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie_id:    String(movie.id),
          title:       movie.title,
          poster_path: movie.poster_path,
          year:        movie.year,
          rating:      movie.rating,
          overview:    movie.overview,
          backdrop_path: movie.backdrop_path
        }),
      })
      const data = await res.json()
      // Sync cache
      if (!_ids) _ids = new Set()
      data.in_watchlist ? _ids.add(String(movie.id)) : _ids.delete(String(movie.id))
      setInWatchlist(data.in_watchlist)
      notify()
    } catch {
      setInWatchlist(!next) // revert on error
    } finally {
      setLoading(false)
    }
  }, [movie, inWatchlist, loading])

  return { inWatchlist, toggle, loading }
}
