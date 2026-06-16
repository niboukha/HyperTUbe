/**
 * apiFetch — language-aware fetch wrapper
 *
 * Automatically:
 *   • appends  ?lang=<code>  to every URL
 *   • sets     Accept-Language: <code>  header
 *   • disables the browser HTTP cache (no-store) so language switches
 *     are never served stale responses
 *
 * The language code is read synchronously from the `lang` cookie, then
 * falls back to localStorage, then to "en".  An explicit `lang` option
 * overrides both.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api"
 *   const res = await apiFetch("/watchlist/", { credentials: "include" })
 *   const res = await apiFetch("/movies/tmdb-550/", { lang: "fr" })
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function currentLangCode(): string {
  if (typeof document === "undefined") return "en"
  const fromCookie = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1]
  if (fromCookie) return fromCookie
  try { return localStorage.getItem("ht_lang") ?? "en" } catch { return "en" }
}

export interface ApiFetchInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>
  lang?: string
}

export function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { lang: explicitLang, headers: extraHeaders = {}, ...rest } = init
  const langCode = explicitLang ?? currentLangCode()

  const base = path.startsWith("http") ? path : `${API_BASE}${path}`
  const url  = new URL(base)
  url.searchParams.set("lang", langCode)

  return fetch(url.toString(), {
    credentials: "include",
    cache:       "no-store",
    ...rest,
    headers: {
      "Accept-Language": langCode,
      ...extraHeaders,
    },
  })
}
