"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { FilterBar, Filters, MIN_YEAR, CURRENT_YEAR } from "@/components/library/filter-bar"
import { MovieGridSkeleton } from "@/components/library/skeletons"
import { ResultsHeader } from "@/components/library/results-header"
import { InfiniteScroll } from "@/components/ui/infinite-scroll"
import { useLibraryMovies } from "@/hooks/use-library-movies"
import { MovieGrid } from "@/components/library/movie-grid"

const DEFAULT_FILTERS: Filters = {
  genres: [],
  sort: "popular",
  minRating: 0,
  yearRange: [MIN_YEAR, CURRENT_YEAR],
}
export default function LibraryPage() {
  const searchParams = useSearchParams()
  const urlQuery     = searchParams.get("q") ?? ""
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const {
    movies, loading, loadingMore, loadMore, hasMore,
    suggestions, isEmpty, loadMoreSuggestions, loadingMoreSugg, suggHasMore, suggst
  } = useLibraryMovies(urlQuery, filters)

  return (
    <div className="min-h-screen flex flex-col gap-4 pb-16! overflow-x-hidden pt-18! px-5! md:px-13! lg:px-16!">

      <FilterBar filters={filters} onChange={setFilters} />

      <ResultsHeader
        loading={loading}
        urlQuery={urlQuery}
        genres={filters.genres}
        count={movies.length}
        hasMore={hasMore}
      />

      {loading ? (
        <MovieGridSkeleton />
      ) : isEmpty ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center py-2! text-center">
            <p className="text-white/15 text-5xl mb-4!">🎬</p>
            <p className="text-white/40 text-base font-medium">
              No results for{" "}
              <span className="text-white/70">
                `{urlQuery || filters.genres.join(", ")}`
              </span>
            </p>
            <p className="text-white/20 text-sm mt-1!">
              Try different keywords or browse our suggestions below
            </p>
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-accent-red font-title text-lg">|</span>
                <span className="text-white/70 font-title tracking-wide uppercase text-sm">
                  You might like
                </span>
              </div>
              <MovieGrid movies={suggst} />
              {/* Suggestions get their own infinite scroll */}
              <InfiniteScroll
                onLoadMore={loadMoreSuggestions}
                hasMore={suggHasMore}
                loading={false}
                loadingMore={loadingMoreSugg}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <MovieGrid movies={movies} />
          <InfiniteScroll
            onLoadMore={loadMore}
            hasMore={hasMore}
            loading={loading}
            loadingMore={loadingMore}
          />
        </>
      )}
    </div>
  )
}