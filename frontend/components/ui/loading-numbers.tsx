import { useEffect, useState } from "react"

export function LoadingNumbers() {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 180))
    }, 80)

    return () => clearInterval(interval)
  }, [])

  return (
    <span className="tabular-nums text-white/20">
      {value}m
    </span>
  )
}