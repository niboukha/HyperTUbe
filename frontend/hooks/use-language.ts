"use client"

import { useState, useEffect } from "react"
import { Language, LANG_CODE, CODE_LANG } from "@/constants/languages"

const API      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const COOKIE_KEY = "lang"
const LS_KEY     = "ht_lang"

// ─── Persistence helpers ──────────────────────────────────────────────────────

function readCookie(): string {
  if (typeof document === "undefined") return ""
  return document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? ""
}

function writeCookie(code: string) {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`
}

function readStorage(): string {
  try { return localStorage.getItem(LS_KEY) ?? "" } catch { return "" }
}

function writeStorage(code: string) {
  try { localStorage.setItem(LS_KEY, code) } catch {}
}

function persist(lang: Language) {
  const code = LANG_CODE[lang]
  writeCookie(code)
  writeStorage(code)
}

// Read initial language synchronously from cookie → localStorage → default.
// This eliminates the English "flash" before the /auth/profile response arrives.
function readInitial(): Language {
  const code = readCookie() || readStorage()
  return CODE_LANG[code] ?? "English"
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _lang: Language        = readInitial()
let _initialized           = false
const _subs                = new Set<() => void>()

function notify() { _subs.forEach(fn => fn()) }

/**
 * Reset the initialisation flag so the next useLanguage mount re-fetches
 * the user's language preference from /auth/profile.
 * Call this after a successful login (SPA flow) or after OAuth redirect.
 */
export function resetLanguageState() {
  _initialized = false
  // Re-read from storage so the UI is at least consistent before the API call.
  const stored = readCookie() || readStorage()
  const lang   = CODE_LANG[stored] ?? "English"
  if (lang !== _lang) {
    _lang = lang
    notify()
  }
}

async function init() {
  if (_initialized) return
  _initialized = true

  // Local cookie / localStorage is the user's explicit choice — never override it.
  // Only fall back to the profile when the user has no stored preference at all
  // (e.g. first visit on a new device after setting a language on another device).
  if (readCookie() || readStorage()) return

  try {
    const res = await fetch(`${API}/auth/profile`, {
      credentials: "include",
      cache:       "no-store",
      headers:     { "Accept-Language": LANG_CODE[_lang] },
    })
    if (res.ok) {
      const data = await res.json()
      const lang = CODE_LANG[data.language] ?? "English"
      if (lang !== _lang) {
        _lang = lang
        persist(_lang)
        notify()
      }
    }
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage() {
  const [lang,      setLangState] = useState<Language>("English")
  const [langReady, setLangReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const refresh = () => { if (mounted) setLangState(_lang) }
    _subs.add(refresh)
    setLangState(_lang)
    setLangReady(true)
    init().then(() => { if (mounted) setLangState(_lang) })
    return () => { _subs.delete(refresh); mounted = false }
  }, [])

  async function setLang(next: Language) {
    _lang = next
    persist(next)
    notify()
    try {
      await fetch(`${API}/users/profile/language`, {
        method:       "PATCH",
        credentials:  "include",
        cache:        "no-store",
        headers:      {
          "Content-Type":    "application/json",
          "Accept-Language": LANG_CODE[next],
        },
        body: JSON.stringify({ language: LANG_CODE[next] }),
      })
    } catch {}
  }

  return { lang, setLang, langCode: LANG_CODE[lang], langReady }
}
