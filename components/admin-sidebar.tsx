"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Briefcase, BarChart3, Settings, X,
  Zap, ChevronRight,
} from "lucide-react"
import type { AdminUser } from "@/lib/admin"

interface AdminSidebarProps {
  adminUser: AdminUser
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { name: "Dashboard",  href: "/admin/dashboard",  icon: LayoutDashboard, color: "text-indigo-400" },
  { name: "Users",      href: "/admin/users",       icon: Users,           color: "text-blue-400"   },
  { name: "Jobs",       href: "/admin/jobs",        icon: Briefcase,       color: "text-emerald-400"},
  { name: "Analytics",  href: "/admin/analytics",   icon: BarChart3,       color: "text-purple-400" },
  { name: "Settings",   href: "/admin/settings",    icon: Settings,        color: "text-slate-400"  },
]

export function AdminSidebar({ adminUser, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={onClose} />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-60 flex-col bg-slate-950 border-r border-slate-800 transition-transform duration-300",
        "lg:static lg:transform-none",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Command Center</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose() }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? item.color : "text-slate-500 group-hover:text-slate-300")} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-7 w-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-400">
                {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminUser.full_name || adminUser.email}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{adminUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
