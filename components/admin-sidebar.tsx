"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, FileText, Settings, BarChart3, Scale, GraduationCap, Bug } from "lucide-react"
import type { AdminUser } from "@/lib/admin"

interface AdminSidebarProps {
  adminUser: AdminUser
}

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "Jobs",
    href: "/admin/jobs",
    icon: FileText,
  },
  {
    name: "Legal Pages",
    href: "/admin/legal-pages",
    icon: Scale,
  },
  {
    name: "Content",
    href: "/admin/content",
    icon: GraduationCap,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Debug",
    href: "/admin/debug",
    icon: Bug,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-white shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <div className="text-xl font-bold text-blue-600">Admin Panel</div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{adminUser.full_name || adminUser.email}</p>
            <p className="text-xs text-gray-500 truncate">{adminUser.email}</p>
            <p className="text-xs text-blue-600 capitalize">{adminUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
