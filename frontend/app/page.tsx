import PrimeRow from "@/components/sections/prime-row";
import ContinueWatching from "@/components/sections/continue-watching"
import LazyRow from "@/components/sections/lazy-row"
import HeroBackground from "@/components/hero/hero-background"

const ROWS = [
  // { title: "Prime Exclusive",  endpoint: "/api/movies?type=prime" },
  { title: "Trending Sci-Fi",  endpoint: "/api/movies?type=trending&genre=28" },
  { title: "Top Rated",        endpoint: "/api/movies?type=top" },
  { title: "Action",           endpoint: "/api/movies?genre=28" },
  { title: "Animation",        endpoint: "/api/movies?genre=16" },
  { title: "Horror",           endpoint: "/api/movies?genre=27" },
  { title: "War",              endpoint: "/api/movies?genre=10752" },
] as const

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col gap-6 pb-6 overflow-x-hidden">
      <HeroBackground />

      <div className="relative z-10 flex flex-col gap-6 px-5! md:px-13! lg:px-16!">
        {/* Always visible — no lazy load */}
        <ContinueWatching title="Continue Watching" />

        <PrimeRow title="Prime Exclusive" endpoint="/api/movies?type=prime" />

        {/* All other rows load only when scrolled into view */}
        {ROWS.map((row) => (
          <LazyRow key={row.endpoint} title={row.title} endpoint={row.endpoint} />
        ))}
      </div>
    </div>
  )
}