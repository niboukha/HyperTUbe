"use client"

import { useState } from "react"
import Image, { ImageProps } from "next/image"

// Hostnames whose images must bypass Next.js optimization.
// The optimizer proxies external URLs through the Next.js server — if the
// upstream host is slow or unreliable (Archive.org routinely times out),
// the optimizer returns 500/504 to the browser. `unoptimized` makes Next.js
// emit the URL directly so the browser fetches it without a server round-trip.
const UNOPTIMIZED_HOSTNAMES = ["archive.org"]

function needsUnoptimized(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false
  return UNOPTIMIZED_HOSTNAMES.some(host => src.includes(host))
}

type MovieImageProps = Omit<ImageProps, "onError">

export function MovieImage({ src, alt, className, ...props }: MovieImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored || !src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-white/5 ${className ?? ""}`}>
        <span className="text-white/15 text-4xl">🎬</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      unoptimized={needsUnoptimized(src)}
      onError={() => setErrored(true)}
      {...props}
    />
  )
}
