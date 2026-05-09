"use client"

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-background border-t border-white/10 mt-20!">
      <div className="px-6! py-12! text-sm text-text-primary/60">

        {/* TOP */}
        <div className="grid grid-cols-2! md:grid-cols-4! gap-8! mb-10! justify-center">

          <div className="flex flex-col gap-2!">
            <h4 className="text-text-primary font-semibold mb-2!">HyperTube</h4>
            <p className="text-xs leading-relaxed">
              Stream trending movies, discover new content, and enjoy a cinematic experience — all in one place.
            </p>
          </div>

          <div className="flex flex-col gap-2!">
            <h4 className="text-text-primary font-semibold mb-2!">Browse</h4>
            <Link href="#">Trending</Link>
            <Link href="#">Top Rated</Link>
            <Link href="#">Genres</Link>
            <Link href="#">New Releases</Link>
          </div>

          <div className="flex flex-col gap-2!">
            <h4 className="text-text-primary font-semibold mb-2!">Account</h4>
            <Link href="#">Profile</Link>
            <Link href="#">Watchlist</Link>
            <Link href="#">Settings</Link>
          </div>

          <div className="flex flex-col gap-2!">
            <h4 className="text-text-primary font-semibold mb-2!">Legal</h4>
            <Link href="#">Terms of Service</Link>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Cookies</Link>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-white/10 pt-6! flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-xs text-text-primary/40">
            © {new Date().getFullYear()} HyperTube. All rights reserved.
          </p>

          {/* SOCIALS */}
          <div className="flex items-center gap-4 text-text-primary/40">
            <span className="hover:text-text-primary cursor-pointer transition">Twitter</span>
            <span className="hover:text-text-primary cursor-pointer transition">GitHub</span>
            <span className="hover:text-text-primary cursor-pointer transition">LinkedIn</span>
          </div>
        </div>
      </div>
    </footer>
  )
}