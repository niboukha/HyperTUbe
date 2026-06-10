"use client"

import { Menu, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { AnimatePresence, motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { navLinks } from "@/constants/nav-links"
import { Language, languages } from "@/constants/languages"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import type { CurrentUser } from "@/hooks/use-current-user"

type Props = {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
  currentLang: Language
  setCurrentLang: (lang: Language) => void
  triggerClassName?: string
  user?: CurrentUser | null
}

export default function MobileToggle({
  mobileMenuOpen,
  setMobileMenuOpen,
  currentLang,
  setCurrentLang,
  triggerClassName = "md:hidden",
  user,
}: Props) {
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "?"
  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      
      {/* TRIGGER */}
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${triggerClassName} relative duration-200 hover:text-text-primary hover:scale-110 transition rounded-md border h-8 px-1! backdrop-blur-2xl! border-white/30 bg-white/10 hover:bg-white/10 text-white`}
        >
          <AnimatePresence mode="wait">
            {mobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className=""
              >
                <Menu className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>

      {/* CONTENT */}
      <SheetContent
        side="right"
        className="w-75 backdrop-blur-md! backdrop-saturate-150! bg-white/15 text-white border-l border-text-primary/30 p-4!"
      >
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
          
          {/* PROFILE */}
          <div className="py-2! flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-md">
              {user?.profile_picture && (
                <AvatarImage src={user.profile_picture} className="rounded-md" />
              )}
              <AvatarFallback className="bg-linear-to-br from-accent-gold to-accent-gold text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="text-white font-medium">{user?.username ?? "..."}</p>
              <p className="text-gray-400 text-sm">@{user?.username ?? "..."}</p>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* NAV LINKS */}
          <nav className="flex-1 space-y-1!">

            {/* Profile Actions */}
            <p className="text-gray-400 text-xs uppercase my-2! px-4 font-bold">
              Profile
            </p>
            <div className="space-y-1!">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-1! py-2! bg-transparent!        
                transition-all duration-150 rounded-md text-text-muted
                hover:bg-text-primary/5! hover:text-text-primary! hover:font-bold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-1! px-1! py-2! bg-transparent!        
                transition-all duration-150 rounded-md text-text-muted
                hover:bg-text-primary/5! hover:text-text-primary! hover:font-bold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
            </div>

            <Separator className="bg-white/10" />
            
            <p className="text-gray-400 text-xs uppercase my-2! px-4 font-bold">
              Sections
            </p>
            {navLinks.map((link) => (
              
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1 px-1! py-2! bg-transparent!        
                transition-all duration-150 rounded-md text-text-muted
                hover:bg-text-primary/5! hover:text-text-primary! hover:font-bold"
              >
                {link.label}
              </Link>
            ))}
            
            <Separator className="bg-white/10 my-4" />

            {/* LANGUAGE */}
            <p className="text-gray-400 text-xs uppercase my-2! font-bold">
              Language
            </p>
            <div className="flex flex-wrap gap-2 py-2!">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCurrentLang(lang)}
                  className={`px-1! py-1! rounded-md text-sm border-white/30 hover:text-white hover:scale-110 transition  ${
                    currentLang === lang
                      ? "font-bold text-white bg-text-primary/10"
                      : "text-gray-300 bg-white/10"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </nav>

          {/* LOGOUT */}
          <button className="mobile-menu-logout flex items-center gap-3 px-1! py-1! w-full rounded-lg text-red-400 transition-all duration-150">

          <LogOut className="h-4 w-4" />
          Logout
        </button>
        </div>
      </SheetContent>
      
    </Sheet>
  )
}