import { Skeleton } from "@/components/ui/skeleton"
import HeaderTitle from "../ui/header-title"

type Props = {
  title: string
  isprime?: boolean
}

export function CarouselSkeleton({ title, isprime }: Props) {
  return (
    <section className="overflow-hidden gap-1 flex flex-col">
      <HeaderTitle title={title} />

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className={
              isprime
                ? "aspect-video min-w-[200px] flex-1 bg-white/5 h-100!"
                : "aspect-video min-w-[180px] md:min-w-[230px] bg-white/5"
            }
          />
        ))}
      </div>
    </section>
  )
}