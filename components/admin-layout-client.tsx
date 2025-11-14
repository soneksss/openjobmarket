"use client"

import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import type { AdminUser } from "@/lib/admin"

interface AdminLayoutClientProps {
  children: React.ReactNode
  adminUser: AdminUser
}

export function AdminLayoutClient({ children, adminUser }: AdminLayoutClientProps) {
  // Enable auto-logout for admin users
  useAutoLogout()

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar adminUser={adminUser} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title="Admin Dashboard" adminUser={adminUser} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}