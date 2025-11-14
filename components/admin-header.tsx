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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center space-x-2 bg-transparent">
              <Home className="h-4 w-4" />
              <span>Back to Main Site</span>
            </Button>
          </Link>

          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-700">{adminUser.full_name || adminUser.email}</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
