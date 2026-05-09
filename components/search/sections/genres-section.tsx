import { Hash } from "lucide-react"
import { GENRES } from "@/constants/search-bar"
import { SectionHeading } from "../section-heading"
import { GenrePill } from "../genre-pill"

type Props = {
  onSelect: (genre: string) => void
}

export function GenresSection({ onSelect }: Props) {
  return (
    <div>
      <SectionHeading icon={<Hash className="h-3 w-3" />} label="Browse genres" />
      <div className="flex flex-wrap gap-1.5 px-2!">
        {GENRES.map((genre) => (
          <GenrePill key={genre} genre={genre} onClick={() => onSelect(genre)} />
        ))}
      </div>
    </div>
  )
}