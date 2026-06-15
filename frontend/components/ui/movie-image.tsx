"use client"

import { useState } from "react"
import Image, { ImageProps } from "next/image"
import { Film } from "lucide-react"
import { proxyImageUrl } from "@/lib/utils/movie"

function resolveImageSrc(src: ImageProps["src"]): ImageProps["src"] {
  if (typeof src !== "string") return src
  return proxyImageUrl(src) ?? src
}

type MovieImageProps = Omit<ImageProps, "onError">

export function MovieImage({ src, alt, className, ...props }: MovieImageProps) {
  const [errored, setErrored] = useState(false)
  const resolved = resolveImageSrc(src)
  const isProxied = typeof resolved === "string" && resolved.includes("/proxy-image")

  if (errored || !src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-white/5 ${className ?? ""}`}>
        <Film className="h-8 w-8 text-white/20" />
      </div>
    )
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      className={className}
      unoptimized={isProxied}
      onError={() => setErrored(true)}
      {...props}
    />
  )
}
