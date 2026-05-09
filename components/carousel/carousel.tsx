"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCarousel } from "./use-carousel"
import { containerVariants } from "@/lib/annimations/continue-watching-variants"
import HeaderTitle from "../ui/header-title"

type Props = {
  title?: string
  children: React.ReactNode
}

export default function Carousel({ title, children }: Props) {
  const { scrollRef, canScrollLeft, canScrollRight, checkScroll, scroll, startAutoScroll, stopAutoScroll } = useCarousel()

  return (
    <section className="overflow-hidden flex flex-col gap-1">
      {title && <HeaderTitle title={title} />}

      <div className="relative">
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-37! w-15! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={() => startAutoScroll("left")}
          onMouseLeave={stopAutoScroll}
        >
          <button
            onClick={() => scroll("left")}
            className="w-15 h-37 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[2px] transition-all duration-200"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>

        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 h-37! w-15! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={() => startAutoScroll("right")}
          onMouseLeave={stopAutoScroll}
        >
          <button
            onClick={() => scroll("right")}
            className="w-15 h-37 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[2px] transition-all duration-200"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-30 bg-linear-to-r from-background to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-30 bg-linear-to-l from-background to-transparent" />
        )}

        <motion.div
          ref={scrollRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onScroll={checkScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-1!"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}