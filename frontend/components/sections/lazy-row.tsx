"use client"

import { useEffect, useRef, useState } from "react"
import MovieRow from "./movie-row"
import { CarouselSkeleton } from "../carousel/CarouselSkeleton"
import { useTranslations } from "next-intl"

type Props = {
  title?:    string
  titleKey?: string
  endpoint:  string
}

export default function LazyRow({ title, titleKey, endpoint }: Props) {
  const t = useTranslations("Sections")
  const resolvedTitle = titleKey ? t(titleKey as any) : (title ?? "")

  const ref       = useRef<HTMLDivElement>(null)
  const hasShown  = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasShown.current) return

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
        ? <CarouselSkeleton title={resolvedTitle} />
        : <MovieRow title={resolvedTitle} endpoint={endpoint} />
      }
    </div>
  )
}
