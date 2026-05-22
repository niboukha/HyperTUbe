// app/(public)/layout.tsx

import TopBar from "@/components/header/top-bar"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* <TopBar variant="public" /> */}
      {children}
    </>
  )
}