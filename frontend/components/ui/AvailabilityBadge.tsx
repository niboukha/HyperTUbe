import { Zap, Crown } from "lucide-react"

type BadgeProps = {
  type: "free" | "premium"
}

export function AvailabilityBadge({ type }: BadgeProps) {
  if (type === "free") {
    return (
      <span className="inline-flex items-center gap-1 bg-[#16a34a] text-white text-[10px] font-bold px-1.5! py-0.5! rounded-[5px] tracking-wide shadow-lg">
        <Zap className="w-3 h-3" />
        FREE
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 bg-[#b45309] text-[#fef3c7] text-[10px] font-bold px-1.5! py-0.5! rounded-[5px] tracking-wide shadow-lg">
      <Crown className="w-3 h-3" />
      PREMIUM
    </span>
  )
}