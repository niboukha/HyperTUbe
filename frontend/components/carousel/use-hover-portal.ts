import { useRef, useState, useCallback } from "react"

export type HoverOrigin = "left" | "center" | "right"

export type HoverState = {
  index: number   // position in array — used by portal for positioning
  id: number      // movie id — used for identity
  origin: "left" | "center" | "right"
  rect: DOMRect
} | null

export function useHoverPortal() {
  const [hover, setHover] = useState<HoverState>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
    
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number, id?: number) => {
    clearHoverTimeout()
    const rect = e.currentTarget.getBoundingClientRect()
    const screenW = window.innerWidth
    let origin: HoverOrigin = "center"
    if (rect.left < screenW * 0.25) origin = "left"
    else if (rect.right > screenW * 0.75) origin = "right"
    setHover({ index, id: id ?? index, origin, rect })
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setHover(null), 100)
  }, [])

  const getPortalStyle = useCallback((rect: DOMRect, origin: HoverOrigin) => {
    const scale = 1.15
    const scaledW = rect.width * scale
    const scaledH = rect.height * scale
    const xShift =
      origin === "left"  ?  rect.width * 0.08 * scale :
      origin === "right" ? -rect.width * 0.08 * scale : 0
    const left = rect.left + (rect.width - scaledW) / 2 + xShift
    const top  = rect.top  + (rect.height - scaledH) / 2

    return {
      position: "fixed" as const,
      top,
      left: Math.max(8, Math.min(left, window.innerWidth - scaledW - 8)),
      width: scaledW,
      zIndex: 9999,
    }
  }, [])

  return { hover, setHover, clearHoverTimeout, handleMouseEnter, handleMouseLeave, getPortalStyle }
}