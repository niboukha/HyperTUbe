export function MovieGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="min-h-screen w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 auto-rows-max content-start">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="aspect-video w-full rounded-[6px] bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}