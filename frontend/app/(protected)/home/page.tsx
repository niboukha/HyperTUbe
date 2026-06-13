import PrimeRow from "@/components/sections/prime-row";
import ContinueWatching from "@/components/sections/continue-watching"
import LazyRow from "@/components/sections/lazy-row"
import HeroBackground from "@/components/hero/hero-background"
import { getMovies } from "@/lib/utils/fetchMovies";
import { cookies } from "next/headers"

export const VALID_LANGS = new Set(["en", "fr", "es"])

const ROWS = [
  { titleKey: "action",         genre: 28 },
  { titleKey: "animation",      genre: 16 },
  { titleKey: "comedy",         genre: 35 },
  { titleKey: "horror",         genre: 27 },
  { titleKey: "scienceFiction", genre: 878 },
  { titleKey: "war",            genre: 10752 },
  { titleKey: "crime",          genre: 80 },
] as const

const UPCOMING_TITLES: Record<string, string> = {
  en: "Upcoming Movies",
  fr: "Films à venir",
  es: "Próximas películas",
}

export default async function Home() {
  const cookieStore = await cookies()
  const raw  = cookieStore.get("lang")?.value ?? "en"
  const lang = VALID_LANGS.has(raw) ? raw : "en"

  const herodata     = await getMovies(`/movies/?type=trending&lang=${lang}`)
  const heroMovies   = herodata.results.slice(0, Math.min(10, herodata.results.length))

  const upcomingdata = await getMovies(`/movies/?type=upcoming&lang=${lang}`)
  const upcoming     = upcomingdata.results

  const upcomingTitle = UPCOMING_TITLES[lang] ?? UPCOMING_TITLES.en

  return (
    <div className="min-h-screen flex flex-col gap-6 pb-20! overflow-x-hidden">

      <HeroBackground movies={heroMovies} />

      <div className="relative z-10 flex flex-col gap-6 px-5! md:px-13! lg:px-16! pb-16!">

        <ContinueWatching />

        <PrimeRow title={upcomingTitle} movies={upcoming} />

        {/* Genre rows: client-side via MovieRow, translates immediately on language change */}
        {ROWS.map((row) => (
          <LazyRow
            key={row.genre}
            titleKey={row.titleKey}
            endpoint={`/movies/?type=genre&genre=${row.genre}`}
          />
        ))}

      </div>
    </div>
  )
}
