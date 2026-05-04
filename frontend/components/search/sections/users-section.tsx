import Image from "next/image"
import { Users } from "lucide-react"
import { highlightMatch } from "@/lib/utils/search-bar"
import { UserResult } from "@/types/search"
import { SectionHeading } from "../section-heading"

type Props = {
  users: UserResult[]
  query: string
  onSelect: (user: UserResult) => void
}

export function UsersSection({ users, query, onSelect }: Props) {
  if (users.length === 0) return null
  return (
    <div className="mb-4!">
      <SectionHeading icon={<Users className="h-3 w-3" />} label="Users" />
      <div className="flex flex-col gap-0.5">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelect(user)}
            className="flex items-center gap-3 px-2! py-1.5! rounded-[6px] cursor-pointer hover:bg-white/6 transition-all"
          >
            <div className="w-8 h-8 shrink-0 rounded-md overflow-hidden relative bg-white/10">
              <Image src={user.avatar || "/default-avatar.png"} alt={user.username || "User"} fill sizes="32px" className="object-cover" />
            </div>
            <p className="text-sm text-white/80">@{highlightMatch(user.username || "", query)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}