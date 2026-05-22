import { useRef, useState, useCallback } from "react"

export function useCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" })
    setTimeout(checkScroll, 300)
  }

  const startAutoScroll = (direction: "left" | "right") => {
    if (autoScrollRef.current) return
    autoScrollRef.current = setInterval(() => {
      scrollRef.current?.scrollBy({ left: direction === "left" ? -6 : 6, behavior: "auto" })
      checkScroll()
    }, 16)
  }

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }
  }

  return { scrollRef, canScrollLeft, canScrollRight, checkScroll, scroll, startAutoScroll, stopAutoScroll }
}
