import { Skeleton } from "@/components/ui/skeleton"
import HeaderTitle from "../ui/header-title"

type Props = {
  title: string
  count?: number
  isprime?: boolean
}

export function CarouselSkeleton({ title, count = 5, isprime }: Props) {
  if (isprime) 
    return (
      <section className="overflow-hidden gap-1 flex flex-col">
        <HeaderTitle title={title} />
        <div className="flex gap-2 h-100!">
            {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full bg-white/5" />
        ))}
        </div>
    </section>
  )

  return (
    <section className="overflow-hidden gap-1 flex flex-col">
      <HeaderTitle title={title} />

      <div className="flex gap-2">
          {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="aspect-video bg-white/5  w-60! md:w-65!" />
          ))}
      </div>
  </section>
  )
}