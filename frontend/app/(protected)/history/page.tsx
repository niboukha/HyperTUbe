"use client"

import HistoryCard from "@/components/history/HistoryCard"
import HeaderTitle from "@/components/ui/header-title"
import { useHistory } from "@/hooks/use-history"
import { useTranslations } from "next-intl"

const GROUP_KEYS: Record<string, string> = {
  "Today":       "today",
  "Yesterday":   "yesterday",
  "Last 7 Days": "last7Days",
  "Last 30 Days":"last30Days",
  "Older":       "older",
}

export default function History() {
  const t = useTranslations("History")
  const { groups, loading, error, isEmpty, removeItem } = useHistory()

  if (loading) {
    return (
      <div className="relative flex flex-col items-center px-4! lg:px-16! mt-15! mb-15! bg-[#0E0E10] min-h-screen">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-full max-w-4xl mb-6!">
            <div className="h-5 w-32 bg-white/5 rounded animate-pulse mb-3!" />
            <div className="h-[200px] w-full bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0E10]">
        <p className="text-white/40 text-base">{t("failed")}</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen flex-1 gap-3 py-32">
        <span className="text-white/40 text-4xl">🎬</span>
        <p className="text-white/40 text-sm">{t("empty")}</p>
        <p className="text-white/25 text-xs">{t("hint")}</p>
      </div>
  )
  }

  return (
    <div className="relative flex flex-col items-center px-4! lg:px-16! space-y-4! mt-15! mb-15! bg-[#0E0E10] min-h-screen">
      {groups.map((group) => (
        <div key={group.group} className="flex flex-col gap-3">
          <div className="px-4!">
            <HeaderTitle title={t(GROUP_KEYS[group.group] as any ?? group.group)} />
          </div>
          <div className="flex flex-col justify-center items-center w-full gap-2 px-4!">
            {group.items.map((item) => (
              <HistoryCard key={item.id} {...item} onDelete={() => removeItem(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
