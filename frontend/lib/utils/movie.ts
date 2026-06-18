const PROXIED_HOSTNAMES = ["archive.org"]
const TMDB_BASE = "https://image.tmdb.org/t/p"

// Safe TMDB URL builder: handles both bare paths (/abc.jpg) and already-full URLs.
export function tmdbImage(path: string | null | undefined, size: string): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path   // already a full URL — don't double-prefix
  return `${TMDB_BASE}/${size}${path}`
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function proxyImageUrl(src: string | null | undefined): string | null {
  if (!src) return null
  if (PROXIED_HOSTNAMES.some(host => src.includes(host))) {
    return `${API_BASE}/proxy-image/?url=${encodeURIComponent(src)}`
  }
  return src
}

export function formatVotes(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export function getReleaseYear(date?: string): string {
  return date ? new Date(date).getFullYear().toString() : "N/A"
}

export function truncateOverview(text: string, max = 180): string {
  if (!text) return ""
  return text.length > max ? text.slice(0, max) + "..." : text
}

