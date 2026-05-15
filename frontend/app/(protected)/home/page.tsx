import PrimeRow from "@/components/sections/prime-row";
import ContinueWatching from "@/components/sections/continue-watching"
import LazyRow from "@/components/sections/lazy-row"
import HeroBackground from "@/components/hero/hero-background"
import { getMovies } from "@/lib/utils/fetchMovies";

const ROWS = [
  { title: "Action",           endpoint: "/movies/?type=genre&genre=28" },
  { title: "Animation",        endpoint: "/movies/?type=genre&genre=16" },
  { title: "Comedy",           endpoint: "/movies/?type=genre&genre=35" },
  { title: "Horror",           endpoint: "/movies/?type=genre&genre=27" },
  { title: "Science Fiction",  endpoint: "/movies/?type=genre&genre=878" },
  { title: "War",              endpoint: "/movies/?type=genre&genre=10752" },
  { title: "Crime",            endpoint: "/movies/?type=genre&genre=80" },
] as const

const HeroMovies      = "/movies/?type=trending";
const upcomingMovies  = "/movies/?type=upcoming"

export default async function Home() {

  const herodata = await getMovies(HeroMovies)
  const heroMovies = herodata.results.slice(0, Math.min(10, herodata.results.length))
  
  const upcomingdata = await getMovies(upcomingMovies)
  const upcoming = upcomingdata.results

  return (
    <div className="min-h-screen flex flex-col gap-6 pb-20! overflow-x-hidden">

      <HeroBackground movies={heroMovies} />

      <div className="relative z-10 flex flex-col gap-6 px-5! md:px-13! lg:px-16! pb-16!">

        <ContinueWatching title="Continue Watching" />

        <PrimeRow title="Upcoming Movies" movies={upcoming} />

        {/* All other rows load only when scrolled into view */}
        {ROWS.map((row) => (
          <LazyRow key={row.endpoint} title={row.title} endpoint={row.endpoint} />
        ))}

      </div>
    </div>
  )
}

