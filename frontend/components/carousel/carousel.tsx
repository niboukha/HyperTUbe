"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCarousel } from "./use-carousel"
import { containerVariants } from "@/lib/annimations/continue-watching-variants"

type Props = {
  title: string
  children: React.ReactNode
}

export default function Carousel({ title, children }: Props) {
  const { scrollRef, canScrollLeft, canScrollRight, checkScroll, scroll, startAutoScroll, stopAutoScroll } = useCarousel()

  return (
    <section className="overflow-hidden">
      <h2 className="text-lg md:text-xl font-title text-text-primary tracking-tight mb-1!">
        <span className="text-accent-red font-extrabold pr-2!">|</span>
        {title}
      </h2>

      <div className="relative">
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-45! w-20! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={() => startAutoScroll("left")}
          onMouseLeave={stopAutoScroll}
        >
          <button
            onClick={() => scroll("left")}
            className="w-10 h-21 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[10px] transition-all duration-200 hover:scale-125"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>

        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 h-45! w-20! z-40 flex items-center justify-center transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={() => startAutoScroll("right")}
          onMouseLeave={stopAutoScroll}
        >
          <button
            onClick={() => scroll("right")}
            className="w-10 h-21 flex items-center justify-center text-text-primary hover:bg-text-primary/5 hover:backdrop-blur-[10px] transition-all duration-200 hover:scale-125"
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