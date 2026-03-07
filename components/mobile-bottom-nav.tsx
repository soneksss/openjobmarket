"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, MessageCircle, Plus, Bookmark, User, LogIn } from "lucide-react"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"

interface MobileBottomNavProps {
  user?: { id: string } | null
  userType?: string | null
}

export function MobileBottomNav({ user, userType }: MobileBottomNavProps) {
  const userId = user?.id
  const pathname = usePathname()
  const { t, locale } = useTranslation()
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread message count
  useEffect(() => {
    if (!userId) return

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)

      setUnreadCount(count || 0)
    }

    fetchUnreadCount()

    // Subscribe to new messages
    const channel = supabase
      .channel("mobile-nav-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  // Don't render for non-authenticated users
  if (!user) return null

  // Determine dashboard URL based on user type
  const getDashboardUrl = () => {
    const basePath = locale === "pt-BR" ? "/br" : ""
    if (!userType) return `${basePath}/dashboard`
    return `${basePath}/dashboard/${userType}`
  }

  // Determine saved URL based on user type
  const getSavedUrl = () => {
    const basePath = locale === "pt-BR" ? "/br" : ""
    return `${basePath}/dashboard/${userType || "professional"}/saved`
  }

  const navItems = [
    {
      key: "search",
      icon: Home,
      label: "Search",
      href: locale === "pt-BR" ? "/br" : "/",
      isActive: pathname === "/" || pathname === "/br",
    },
    {
      key: "messages",
      icon: MessageCircle,
      label: "Messages",
      href: locale === "pt-BR" ? "/br/messages" : "/messages",
      isActive: pathname?.includes("/messages"),
      badge: unreadCount,
    },
    {
      key: "post",
      icon: Plus,
      label: "Post",
      href: locale === "pt-BR" ? "/br/jobs/new" : "/jobs/new",
      isActive: pathname?.includes("/jobs/new"),
      isCenter: true,
    },
    {
      key: "saved",
      icon: Bookmark,
      label: "Saved",
      href: getSavedUrl(),
      isActive: pathname?.includes("/saved"),
    },
    {
      key: "account",
      icon: User,
      label: "Account",
      href: getDashboardUrl(),
      isActive: pathname?.includes("/dashboard") && !pathname?.includes("/saved"),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 border-t border-slate-700 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          if (item.isCenter) {
            // Center highlighted button (Post Job)
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <span className="text-xs mt-1 text-slate-400 font-medium">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative ${
                isActive
                  ? "text-emerald-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                {item.key === "messages" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
