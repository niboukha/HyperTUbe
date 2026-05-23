"use client"

import { useEffect, useRef, useState } from "react"
import MovieRow from "./movie-row"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"

type Props = {
  title:    string
  endpoint: string
}

export default function LazyRow({ title, endpoint }: Props) {
  const ref            = useRef<HTMLDivElement>(null)
  const hasShown       = useRef(false)          // persists across StrictMode remounts
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasShown.current) return         // skip if already triggered

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasShown.current = true
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="min-h-[120px]">
      {!visible
        ? <CarouselSkeleton title={title} />
        : <MovieRow title={title} endpoint={endpoint} />
      }
    </div>
  )
}