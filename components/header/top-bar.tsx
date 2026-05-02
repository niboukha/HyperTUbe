"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "@/components/ui/logo"
import SearchBar from "@/components/ui/search-bar"
import { Language, languages } from "@/constants/languages"
import NavLinks from "./nav-links"
import ProfileMenu from "./profile-menu"
import MobileToggle from "./mobile-toggle"
import LanguageMenu from "./language-menu"

export default function TopBar() {
  const [currentLang, setCurrentLang] = useState<Language>(languages[0])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const ticking = useRef(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY
          setScrolled(currentY > 10)
          if (currentY > lastScrollY.current && currentY > 80) {
            setHidden(true)
          } else {
            setHidden(false)
          }
          lastScrollY.current = currentY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out"
      style={{
        background: scrolled ? "rgba(var(--background), 0.1)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
        transition: "background 0.7s ease, backdrop-filter 0.7s ease, border-color 0.7s ease",
      }}
    >
      <div className="flex items-center justify-between px-4! md:px-12! lg:px-16! h-14">

        {/* LEFT */}
        <div className="flex items-center gap-10 min-w-0">

          {/* Logo hides when search is open */}
          <AnimatePresence mode="wait">
            {!searchOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "linear" }}
              >
                <Logo />
              </motion.div>
            )}
          </AnimatePresence>

          {/* NavLinks fade out when search is open */}
          <AnimatePresence mode="wait">
            {!searchOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
              >
                <NavLinks />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 md:gap-4 flex-1 justify-end">

          <AnimatePresence>
            {!searchOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "linear" }}
                className="relative"
              >
                <SearchBar
                  open={searchOpen}
                  onOpenChange={setSearchOpen}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* LanguageMenu fades out when search is open */}
          <AnimatePresence>
            {!searchOpen && (
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
            )}
          </AnimatePresence>

          {/* ProfileMenu fades out when search is open */}
          <AnimatePresence>
            {!searchOpen && (
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
            )}
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

        </div>
      </div>
    </motion.header>
  )
}