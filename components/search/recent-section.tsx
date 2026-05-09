import { Clock, X } from "lucide-react"
import { SectionHeading } from "./section-heading"

type Props = {
  searches: string[]
  onSelect: (term: string) => void
  onRemove: (e: React.MouseEvent, term: string) => void
}

export function RecentSection({ searches, onSelect, onRemove }: Props) {
  if (searches.length === 0) return null
  return (
    <div className="mb-4!">
      <SectionHeading icon={<Clock className="h-3 w-3" />} label="Recent" />
      <div className="flex flex-col gap-0.5">
        {searches.map((term, i) => (
          <div
            key={i}
            onClick={() => onSelect(term)}
            className="flex items-center justify-between px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/10 group transition-colors"
          >
            <span className="text-sm text-white group-hover:text-white/90 transition-colors">{term}</span>
            <button
              onClick={(e) => onRemove(e, term)}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}