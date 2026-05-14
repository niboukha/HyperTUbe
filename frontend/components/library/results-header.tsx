type Props = {
  loading: boolean
  urlQuery: string
  genres: string[]
  count: number
  hasMore: boolean
}

export function ResultsHeader({ loading, urlQuery, genres, count, hasMore }: Props) {
  const label = urlQuery || (genres.length > 0 ? genres.join(" · ") : "Trending")
  return (
    <div className="flex items-center gap-3">
      <span className="text-accent-red font-title text-lg">|</span>
      <span className="text-white font-title tracking-wide uppercase text-lg">
        {loading ? (
          <span className="inline-flex items-center gap-2 text-white/30 text-sm font-sans normal-case tracking-normal">
            <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
            Searching…
          </span>
        ) : label}
      </span>
      {!loading && count > 0 && (
        <span className="text-white/25 text-sm font-sans normal-case tracking-normal">
          {count}{hasMore ? "+" : ""} titles
        </span>
      )}
    </div>
  )
}