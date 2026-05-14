export function SectionHeading({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2!">
      {icon && <span className="text-white/30">{icon}</span>}
      <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{label}</span>
    </div>
  )
}