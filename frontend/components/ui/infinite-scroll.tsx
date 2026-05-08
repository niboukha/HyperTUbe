"use client"

import { useEffect, useRef } from "react"

type Props = {
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  rootMargin?: string
  loadingIndicator?: React.ReactNode
  endMessage?: React.ReactNode
}

const DefaultLoadingIndicator = () => (
  <div className="flex justify-center pt-6!">
    <div className="flex items-center gap-2 text-white/25 text-xs">
      {/* <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
      Loading more… */}
    </div>
  </div>
)

const DefaultEndMessage = () => (
  <div className="flex justify-center pt-6!">
    {/* <p className="text-white/15 text-xs uppercase tracking-widest">End of results</p> */}
  </div>
)

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  loadingMore,
  rootMargin = "300px",
  loadingIndicator = <DefaultLoadingIndicator />,
  endMessage = <DefaultEndMessage />,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { rootMargin }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [onLoadMore, rootMargin])

  return (
    <>
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && loadingIndicator}
      {!loading && !loadingMore && !hasMore && endMessage}
    </>
  )
}