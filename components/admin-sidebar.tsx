"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Briefcase, BarChart3, Settings, X, Zap, Map, Megaphone, ShieldCheck,
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
  { name: "Jobs",         href: "/admin/jobs",           icon: Briefcase,       color: "text-emerald-400"},
  { name: "Seeded Trades",href: "/admin/seeded-trades",  icon: Map,             color: "text-amber-400"  },
  { name: "Verification", href: "/admin/verification",   icon: ShieldCheck,     color: "text-emerald-400"},
  { name: "Analytics",   href: "/admin/analytics",      icon: BarChart3,       color: "text-purple-400" },
  { name: "Marketing",  href: "/admin/marketing",   icon: Megaphone,       color: "text-pink-400"   },
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
        "fixed inset-y-0 left-0 z-50 flex h-full w-36 flex-col bg-zinc-950 border-r border-zinc-800/60 transition-transform duration-300",
        "lg:static lg:transform-none",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800/60 px-3">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose() }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all group",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
                )}
              >
                <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? item.color : "text-zinc-600 group-hover:text-zinc-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-zinc-800/60 px-3 py-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-5 w-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-indigo-400">
                {(adminUser.full_name || adminUser.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate">{adminUser.full_name || adminUser.email}</p>
          </div>
        </div>
      </div>
    </>
  )
}
