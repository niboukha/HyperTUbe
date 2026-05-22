import { TrendingUp } from "lucide-react"
import { TRENDING } from "@/constants/search-bar"
import { SectionHeading } from "../section-heading"

type Props = {
  onSelect: (term: string) => void
}

export function TrendingSection({ onSelect }: Props) {
  return (
    <div className="mb-4!">
      <SectionHeading icon={<TrendingUp className="h-3 w-3" />} label="Trending" />
      <div className="flex flex-col gap-0.5">
        {TRENDING.map((term, i) => (
          <div
            key={i}
            onClick={() => onSelect(term)}
            className="flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/10 group transition-colors"
          >
            <span className="text-[11px] text-white/20 w-4 text-right font-mono">{i + 1}</span>
            <span className="text-sm text-white group-hover:text-white/90 transition-colors">{term}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
