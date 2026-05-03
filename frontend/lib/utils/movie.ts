
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

