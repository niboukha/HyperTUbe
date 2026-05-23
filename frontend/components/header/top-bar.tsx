"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "@/components/ui/logo"
import SearchBar from "../search/search-bar"
import { Language, languages } from "@/constants/languages"
import NavLinks from "./nav-links"
import ProfileMenu from "./profile-menu"
import MobileToggle from "./mobile-toggle"
import LanguageMenu from "./language-menu"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

export default function TopBar() {
  const [currentLang, setCurrentLang] = useState<Language>(languages[0])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const pathname = usePathname()

  const isLibrary = pathname.startsWith("/library")
  const isAnyMenuOpen = searchOpen || mobileMenuOpen
  
  const [isTop, setIsTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY

      setIsTop(y <= 10)

      if (isAnyMenuOpen) {
        setHidden(false)
        lastScrollY.current = y
        return
      }

      const scrollingDown = y > lastScrollY.current

      if (y > 80 && scrollingDown) {
        setHidden(true)
      } else {
        setHidden(false)
      }

      lastScrollY.current = y
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // init state

    return () => window.removeEventListener("scroll", handleScroll)
  }, [isAnyMenuOpen])

  
  // On library page keep search forced open and header always visible
  // const effectiveOpen = isLibrary ? true : searchOpen
  // const effectiveHidden = isLibrary ? false : hidden

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out"
      style={{
        background: isTop
          ? "transparent"
          : "rgba(var(--background), 0.1)",

        backdropFilter: isTop
          ? "none"
          : "blur(20px)",

        borderBottom: isTop
          ? "1px solid transparent"
          : "1px solid rgba(255,255,255,0.1)",

        transition: "background 0.7s ease, backdrop-filter 0.7s ease, border-color 0.7s ease",
      }}
      // style={{
      //   background: scrolled ? "rgba(var(--background), 0.1)" : "transparent",
      //   backdropFilter: scrolled ? "blur(24px)" : "none",
      //   borderBottom: scrolled ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
      //   transition: "background 0.7s ease, backdrop-filter 0.7s ease, border-color 0.7s ease",
      // }}
    >
      <div className="flex items-center justify-between px-4! md:px-12! lg:px-16! h-14">

        {/* LEFT */}
        <div className="flex items-center gap-10 min-w-0">

          <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "linear" }}
              >
                <Logo />
              </motion.div>
          </AnimatePresence>

          {/* NavLinks fade out when search is open */}
          <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
              >
                <NavLinks />
              </motion.div>
          </AnimatePresence>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 md:gap-4 flex-1 justify-end">

          <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
                className="relative"
              >
                <SearchBar
                  open={searchOpen}
                  onOpenChange={isLibrary ? undefined : setSearchOpen}
                  isLibraryMode={isLibrary}
                />
              </motion.div>
          </AnimatePresence>

          {/* LanguageMenu fades out when search is open */}
          <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
                className="hidden md:flex items-center"
              >
                <LanguageMenu
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                  onOpen={() => setSearchOpen(false)}
                />
              </motion.div>
          </AnimatePresence>

          {/* Logout button */}


          {/* ProfileMenu fades out when search is open */}
          <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
                className="hidden md:flex items-center"
              >
                <ProfileMenu
                  onOpen={() => setSearchOpen(false)}
                />
              </motion.div>
          </AnimatePresence>

          <MobileToggle
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={(v) => {
              setMobileMenuOpen(v)
              if (v) setSearchOpen(false)
            }}
            currentLang={currentLang}
            setCurrentLang={setCurrentLang}
          />

          <AnimatePresence>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              // onClick={() => signOut()}
              className="
                hidden md:flex
                items-center justify-center
                p-1!
                rounded-md
                text-white/70
                hover:text-white
                hover:bg-white/10
                transition-all duration-200 border
                border-white/30 bg-white/10 hover:scale-110
                backdrop-blur-2xl! backdrop-saturate-150!
              "
            >
              <LogOut size={21.5} strokeWidth={2.5} />
            </motion.button>
          </AnimatePresence>

        </div>
      </div>
    </motion.header>
  )
}
