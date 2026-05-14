import { forwardRef } from "react"
import { Search, X } from "lucide-react"

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  loading: boolean
  placeholder?: string
  variant?: "navbar" | "inline" | "library"
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onClear, loading, placeholder, variant = "navbar" }, ref) => {
    const isInline = variant === "inline"
    const isLibrary = variant === "library"

    return (
      <div className={`flex items-center gap-2 text-white transition-all duration-200 ${
        isLibrary
          ? "rounded-md px-3! py-1! border border-white/20 bg-white/8 backdrop-blur-md focus-within:border-white/30"
          : isInline
          ? "rounded-md px-3! py-2.5! border border-white/30 bg-white/10 backdrop-blur-md focus-within:border-white/30"
          : "rounded-t-md px-3! py-1.25! border-b border-b-white/30 focus-within:border-white/35"
      }`}>
        <Search className="h-5 w-5 text-white/40 shrink-0" />

        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Search movies, series, genres..."}
          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
          autoFocus={isLibrary}
        />

        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-3 h-3 border border-white/30 border-t-white/60 rounded-full animate-spin" />
          )}

          {value && (
            <button onClick={onClear}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {!isInline && !isLibrary && (
            <kbd className="text-[10px] text-white/20 border border-white/30 rounded px-1 py-0.5 font-mono">ESC</kbd>
          )}
          {isLibrary && (
            <kbd className="hidden md:flex text-[10px] text-white/20 border border-white/15 rounded px-1 py-0.5 font-mono">ESC</kbd>
          )}
        </div>
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"
