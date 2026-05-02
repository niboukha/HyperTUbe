export type NavLink = {
  href: string
  label: string
}

export const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
  { href: "/watchlist", label: "Watchlist" },
]
