import type React from "react"
import { getAdminUser } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { AdminLayoutClient } from "@/components/admin-layout-client"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const adminUser = await getAdminUser()

  // Allow access to login/register pages without authentication
  if (!adminUser) {
    redirect("/admin/login")
  }

  return (
    <AdminLayoutClient adminUser={adminUser}>
      {children}
    </AdminLayoutClient>
  )
}
