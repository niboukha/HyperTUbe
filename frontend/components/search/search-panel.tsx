import { TrendingSection } from "./sections/trending-section"
import { GenresSection } from "./sections/genres-section"
import { TopResultsSection } from "./sections/top-results-section"
import { MoviesSection } from "./sections/movies-section"
import { UsersSection } from "./sections/users-section"
import { MovieResult, UserResult } from "@/types/search"
import { RecentSection } from "./recent-section"

type Props = {
  query           : string
  movies          : MovieResult[]
  users           : UserResult[]
  loading         : boolean
  activeIndex     : number
  recentSearches  : string[]
  onSelectMovie   : (movie: MovieResult) => void
  onSelectUser    : (user: UserResult) => void
  onSelectGenre   : (genre: string) => void
  onSelectRecent  : (term: string) => void
  onRemoveRecent  : (e: React.MouseEvent, term: string) => void
  onSelectTrending: (term: string) => void
}

export function SearchPanel({
  query, movies, users, loading, activeIndex,
  recentSearches,
  onSelectMovie, onSelectUser, onSelectGenre,
  onSelectRecent, onRemoveRecent, onSelectTrending,
}: Props) {
  const isEmpty = query.length === 0
  const topMovies = movies.slice(0, 4)
  const listMovies = movies.slice(0, 8)
  const hasResults = movies.length > 0 || users.length > 0

  if (isEmpty) {
    return (
      <div className="p-2!">
        <RecentSection searches={recentSearches} onSelect={onSelectRecent} onRemove={onRemoveRecent} />
        <TrendingSection onSelect={onSelectTrending} />
        {/* <GenresSection onSelect={onSelectGenre} /> */}
      </div>
    )
  }

  if (!hasResults && !loading) {
    return (
      <div className="px-4! py-10! text-center ">
        <p className="text-white/30 text-sm">
          No results for <span className="text-white/50">`{query}`</span>
        </p>
        <p className="text-white/20 text-xs mt-1">Try a different title or browse genres</p>
      </div>
    )
  }

  return (
    <div className="p-1!">
      <TopResultsSection movies={topMovies} query={query} activeIndex={activeIndex} onSelect={onSelectMovie} />
      <MoviesSection movies={listMovies} query={query} activeIndex={activeIndex} topCount={topMovies.length} onSelect={onSelectMovie} />
      <UsersSection users={users} query={query} onSelect={onSelectUser} />
      {/* <GenresSection onSelect={onSelectGenre} /> */}
    </div>
  )
}