export function GenrePill({ genre, onClick }: { genre: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-white/50 border border-white/30 bg-white/5 hover:bg-white/10 hover:text-white/90 px-2.5! py-1! rounded-full transition-all duration-150"
    >
      {genre}
    </button>
  )
}