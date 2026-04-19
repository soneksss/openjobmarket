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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminLayoutClientProps {
  children: React.ReactNode
  adminUser: AdminUser
}

export function AdminLayoutClient({ children, adminUser }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useAutoLogout()

  return (
    <div className="flex h-screen bg-slate-950">
      <AdminSidebar adminUser={adminUser} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold text-white">Command Center</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-400">
                    {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center cursor-pointer text-slate-300">
                  <Home className="h-4 w-4 mr-2" /> Main Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => manualLogout()} className="flex items-center cursor-pointer text-slate-300">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AdminHeader title="Admin" adminUser={adminUser} />
        <main className="flex-1 overflow-hidden bg-slate-950">
          <div className="h-full mx-auto max-w-7xl overflow-y-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
