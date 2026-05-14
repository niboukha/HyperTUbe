import { Zap, Crown } from "lucide-react"

type BadgeProps = {
  type: "free" | "premium"
  className?: string
  badgeClassName?: string
}

export function AvailabilityBadge({ type, className, badgeClassName }: BadgeProps) {
  if (type === "free") {
    return (
      <span className={`inline-flex items-center gap-1 bg-[#16a34a] text-white rounded-[5px] tracking-wide shadow-lg ${className || "text-[8px] font-bold px-1! py-0.5!"}`}>
        <Zap className={` ${badgeClassName || "w-2.5 h-2.5"}`} />
        FREE
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 bg-[#b45309] text-[#fef3c7] rounded-[5px] tracking-wide shadow-lg ${className || "text-[8px] font-bold px-1! py-0.5!"}`}>
      <Crown className={` ${badgeClassName || "w-2.5 h-2.5"}`} />
      PREMIUM
    </span>
  )
}