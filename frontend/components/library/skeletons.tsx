export function MovieGridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3!">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-video min-w-45 md:min-w-57.5 rounded-[6px] bg-white/5 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          {/* <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse border border-green-500" style={{ animationDelay: `${i * 40 + 80}ms` }} />
          <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse border border-blue-500" style={{ animationDelay: `${i * 40 + 120}ms` }} /> */}
        </div>
      ))}
    </div>
  )
}
