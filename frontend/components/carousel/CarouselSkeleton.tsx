import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  title: string
  count?: number
}

export function CarouselSkeleton({ title, count = 6 }: Props) {
  return (
    <section className="overflow-hidden">
        <h2 className="text-lg md:text-xl font-title text-text-primary tracking-tight mb-1!">
            <span className="text-accent-red font-extrabold pr-2!">|</span>
            {title}
        </h2>
        {/* <Skeleton className="h-6 w-40 mb-3! bg-white/5 rounded-md" /> */}
        <div className="flex gap-2">
            {Array.from({ length: count }).map((_, i) => (
            // <div key={i} className="shrink-0 w-70 md:w-75 aspect-video rounded-md bg-white/5 animate-pulse" />
                <Skeleton key={i} className="aspect-video w-full bg-white/5" />
            ))}
        </div>
    </section>
  )
}