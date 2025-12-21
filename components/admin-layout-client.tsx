"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import { manualLogout } from "@/hooks/use-auto-logout"
import type { AdminUser } from "@/lib/admin"
import { Menu, Home, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminLayoutClientProps {
  children: React.ReactNode
  adminUser: AdminUser
}

export function AdminLayoutClient({ children, adminUser }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Enable auto-logout for admin users
  useAutoLogout()

  const handleSignOut = async () => {
    await manualLogout()
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar
        adminUser={adminUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile menu bar */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="text-lg font-bold text-blue-600">Admin Panel</div>

          {/* Mobile user menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">
                {adminUser.full_name || adminUser.email}
              </div>
              <div className="px-2 py-1.5 text-xs text-gray-500">
                {adminUser.email}
              </div>
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center cursor-pointer">
                  <Home className="h-4 w-4 mr-2" />
                  <span>Main Site</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AdminHeader title="Admin Dashboard" adminUser={adminUser} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}