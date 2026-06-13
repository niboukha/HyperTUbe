export type NavLink = {
  href: string
  key: string
}

export const navLinks: NavLink[] = [
  { href: "/home",      key: "home" },
  { href: "/library",   key: "library" },
  { href: "/history",   key: "history" },
  { href: "/watchlist", key: "watchlist" },
]
