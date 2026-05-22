// app/(protected)/layout.tsx

import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import TopBar from "@/components/header/top-bar"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/login")
  }

  return (
    <>
      <TopBar />
      {children}
    </>
  )
}