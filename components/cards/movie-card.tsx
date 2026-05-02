"use client"

import Image from "next/image"
import { Card } from "@/components/ui/card"

interface MovieCardProps {
  title: string
  posterPath: string | null
  year: string | number
}

export function MovieCard({ title, posterPath, year }: MovieCardProps) {
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : null

    return (
    <Card className="flex-shrink-0 w-[140px] md:w-[160px] bg-transparent border-0 cursor-pointer group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#1a1a1a]">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 140px, 160px"
            className="object-cover transition-all duration-200 group-hover:scale-105 group-hover:brightness-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
            No Image
          </div>
        )}
      </div>
      <div className="pt-2">
        <p className="text-white text-sm font-medium truncate">{title}</p>
        <p className="text-white/50 text-xs">{year}</p>
      </div>
    </Card>
  )
}
