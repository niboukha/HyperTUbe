"use client"

import { useEffect, useState } from "react"

export type CurrentUser = {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  avatar: string | null
  language: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [])

  return user
}
