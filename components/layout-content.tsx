"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/toaster"
import { useAutoLogout } from "@/hooks/use-auto-logout"

export function LayoutContent({
  children,
  user,
  userType,
}: {
  children: React.ReactNode
  user: any
  userType: string | null
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")

  // Enable auto-logout for authenticated users
  useAutoLogout()

  // Debug logging for header user data
  console.log('[LAYOUT-CONTENT] User data passed to header:', {
    hasUser: !!user,
    userEmail: user?.email,
    userType,
    pathname
  })

  if (isAdminRoute) {
    return (
      <>
        <main className="flex-1">{children}</main>
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Header user={user} userType={(userType as "company" | "professional" | undefined) || undefined} />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster />
    </>
  )
}
