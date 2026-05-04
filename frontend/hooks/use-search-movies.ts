import { useEffect, useState, useRef } from "react"
import { MovieResult } from "@/types/search"

type State = {
  data: MovieResult[]
  loading: boolean
  error: boolean
}

export function useSearchMovies(query: string) {
  const [state, setState] = useState<State>({
    data: [],
    loading: false,
    error: false,
  })

  const cache = useRef<Map<string, MovieResult[]>>(new Map())

  useEffect(() => {
    if (!query) {
      return
    }

    // CACHE HIT
    if (cache.current.has(query)) {
      setState({
        data: cache.current.get(query)!,
        loading: false,
        error: false,
      })
      return
    }

    let ignore = false

    const fetchData = async () => {
      try {
        setState((s) => ({ ...s, loading: true }))

        const res = await fetch(`/api/search?q=${query}`)
        const data = await res.json()

        if (!ignore) {
          cache.current.set(query, data.results)
          setState({
            data: data.results,
            loading: false,
            error: false,
          })
        }
      } catch {
        if (!ignore) {
          setState({
            data: [],
            loading: false,
            error: true,
          })
        }
      }
    }

    fetchData()

    return () => {
      ignore = true
    }
  }, [query])

  return state
}