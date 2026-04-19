"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, LogOut } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { manualLogout } from "@/hooks/use-auto-logout"
import type { AdminUser } from "@/lib/admin"

interface AdminHeaderProps {
  title: string
  adminUser: AdminUser
}

export function AdminHeader({ title, adminUser }: AdminHeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    // Use the manual logout function which clears everything
    await manualLogout()
  }

  return (
    <header className="hidden lg:flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      <span className="text-xs font-medium text-zinc-500">{title}</span>

      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2">
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Main Site</span>
          </Button>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-xs font-medium text-zinc-300">
              {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-zinc-500">{adminUser.full_name || adminUser.email}</span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleSignOut}
          className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  )
}
