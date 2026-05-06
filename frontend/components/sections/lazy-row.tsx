"use client"

import { useEffect, useRef, useState } from "react"
import MovieRow from "./movie-row"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"

type Props = {
  title: string
  endpoint: string
}

export default function LazyRow({ title, endpoint }: Props) {
  const ref        = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "300px",
        threshold: 0,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {/* Show skeleton until row becomes visible */}
      {!visible
        ? <CarouselSkeleton title={title} />
        : <MovieRow title={title} endpoint={endpoint} />
      }
    </div>
  )
}