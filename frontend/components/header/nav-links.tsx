"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navLinks } from "@/constants/nav-links"
import { useTranslations } from "next-intl"

export default function NavLinks() {
  const pathname = usePathname()
  const t = useTranslations("Nav")

  return (
    <nav className="hidden md:flex items-center gap-5">
      {navLinks.map((link) => {
        const isActive = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors duration-200 relative group
              ${
                isActive
                  ? "text-text-primary font-bold"
                  : "font-medium text-text-primary/70 hover:text-text-primary"
              }
            `}
          >
            {t(link.key as any)}

            {/* underline */}
            <span className="absolute -bottom-1 left-0 h-0.5 bg-accent-red transition-all duration-200 w-0 group-hover:w-full" />
          </Link>
        )
      })}
    </nav>
  )
}