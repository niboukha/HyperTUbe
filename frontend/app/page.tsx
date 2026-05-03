import { HeroBackground } from "@/components/hero/hero-background";
import  MoviesRow  from "@/components/sections/movie-row";
import ContinueWatching from "@/components/sections/continue-watching";
import PrimeRow from "@/components/sections/prime-row";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col gap-6 pb-6! overflow-x-hidden">
      <HeroBackground />

      <div className="relative z-10 flex flex-col gap-6 px-5! md:px-13! lg:px-16! ">
        <ContinueWatching title="Continue Watching" />

        <PrimeRow title="Prime Exclusive" endpoint="/api/movies?type=prime" />
        
        <MoviesRow title="Trending"   endpoint="/api/movies?type=trending&genre=Sci-Fi" />

        <MoviesRow title="Top Rated"  endpoint="/api/movies?type=top" />
        
        <MoviesRow title="Action"     endpoint="/api/movies?type=popular&genre=Action" />
        
        <MoviesRow title="Animation"     endpoint="/api/movies?type=popular&genre=Animation" />
        
        <MoviesRow title="Horror"     endpoint="/api/movies?type=popular&genre=Horror" />
        
        <MoviesRow title="War"     endpoint="/api/movies?type=popular&genre=War" />
        
      </div>
    </div>
  )
}
