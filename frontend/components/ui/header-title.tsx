export default function HeaderTitle({ title }: { title: string }) {
  return (
      <h2 className="text-lg md:text-xl font-title text-text-primary tracking-tight">
        <span className="text-accent-red font-extrabold pr-2!">|</span>
        {title}
      </h2>
  )
}