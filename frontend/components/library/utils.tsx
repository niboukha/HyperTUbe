import { motion } from "framer-motion"

function YearInput({
  label,
  value,
  min,
  max,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  onCommit?: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 justify-between">
      <span className="text-xs text-white/40 w-8">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v >= min && v <= max) onChange(v)
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          e.preventDefault()
          const v = Number(e.currentTarget.value)
          if (v >= min && v <= max) {
            onChange(v)
            onCommit?.(v)
          }
        }}
        className="flex-1 bg-white/10 border border-white/10 rounded-[6px] px-2! py-1! text-sm text-white/80 outline-none focus:border-white/25 transition-colors text-center"
      />
    </div>
  )
}

function FilterDropdown({ children, width = 200, isSorte }: { children: React.ReactNode; width?: number, isSorte?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      style={{ width }}
      className={`absolute top-full ${isSorte ? "left-0" : "right-0"} mt-2! z-50 rounded-md border border-white/15 bg-black/10 backdrop-blur-xl p-3! shadow-2xl`}
    >
      {children}
    </motion.div>
  )
}

export { YearInput, FilterDropdown }
