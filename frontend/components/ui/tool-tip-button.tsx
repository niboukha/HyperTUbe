// components/ui/tooltip-button.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type Props = {
  label: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function TooltipButton({ label, onClick, children, className }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button onClick={onClick} className={className}>
        {children}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
              text-[10px] font-medium text-white bg-[#2a2a2a]
              px-2! py-1! rounded-lg border border-white/10
              pointer-events-none z-50 shadow-lg"
          >
            {label}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2a2a2a]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}