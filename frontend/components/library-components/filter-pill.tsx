import { ChevronDown } from "lucide-react"

export default function FilterPill({
  label,
  active,
  badge,
  icon,
  onClick,
  children,
}: {
  label: string
  active: boolean
  badge?: string | number
  icon?: React.ReactNode
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 text-xs rounded-full border px-3! py-1.5! transition-all duration-150 ${
          active || badge
            ? "bg-white/12 border-white/25 text-white/90"
            : "border-white/12 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
        }`}
      >
        {icon && <span className={active || badge ? "text-white/60" : "text-white/30"}>{icon}</span>}
        {label}
        {badge !== undefined ? (
          <span className="ml-0.5 bg-white/20 text-white/90 rounded-full px-1.5! py-0.5! text-[10px] leading-none">
            {badge}
          </span>
        ) : (
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${active ? "rotate-180" : ""} ${
              active ? "text-white/60" : "text-white/25"
            }`}
          />
        )}
      </button>
      {children}
    </div>
  )
}
