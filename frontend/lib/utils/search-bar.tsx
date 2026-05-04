import { MAX_RECENT, RECENT_SEARCHES_KEY } from "@/constants/search-bar"

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveRecentSearch(query: string) {
  if (!query.trim()) return
  const recent = getRecentSearches().filter((q) => q !== query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([query, ...recent].slice(0, MAX_RECENT)))
}

export function removeRecentSearch(query: string) {
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(getRecentSearches().filter((q) => q !== query))
  )
}


export function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>
  
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(255,255,255,0.18)",
          color: "inherit",
          borderRadius: "2px",
          padding: "0 1px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
