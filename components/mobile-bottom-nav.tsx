"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, MessageCircle, Plus, Bookmark, User, Map, Bell } from "lucide-react"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"

interface MobileBottomNavProps {
  user?: { id: string } | null
  userType?: string | null
}

export function MobileBottomNav({ user, userType }: MobileBottomNavProps) {
  const userId = user?.id
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useTranslation()
  const supabase = createClient()

  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const base = locale === "pt-BR" ? "/br" : ""

  // Fetch unread message count
  useEffect(() => {
    if (!userId) return

    const fetchMessages = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
      setUnreadMessages(count || 0)
    }

    fetchMessages()

    const channel = supabase
      .channel("mobile-nav-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` }, fetchMessages)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Fetch unread notification count (for tradesperson nav)
  useEffect(() => {
    if (!userId) return

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
      setUnreadNotifications(count || 0)
    }

    fetchNotifications()

    const channel = supabase
      .channel("mobile-nav-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchNotifications)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetchNotifications)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (!user) return null

  const getDashboardUrl = () => {
    if (!userType) return `${base}/dashboard`
    if (userType === "employer") return `${base}/dashboard/company`
    return `${base}/dashboard/${userType}`
  }

  const isHomeowner = userType === "homeowner"
  const isTradesperson = userType === "professional" || userType === "contractor" || userType === "company" || userType === "employer" || userType === "jobseeker"

  // ── Homeowner nav ──────────────────────────────────────────────────────────
  if (isHomeowner) {
    const items = [
      { key: "search",   icon: Home,          label: "Search",   href: `${base}/`,                              isActive: pathname === "/" || pathname === "/br" },
      { key: "messages", icon: MessageCircle, label: "Messages", href: `${base}/messages`,                      isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
      { key: "post",     icon: Plus,          label: "Post",     href: `${base}/jobs/new`,                      isActive: !!pathname?.includes("/jobs/new"), isCenter: true },
      { key: "saved",    icon: Bookmark,      label: "Saved",    href: `${base}/dashboard/homeowner/saved`,     isActive: !!pathname?.includes("/saved") },
      { key: "account",  icon: User,          label: "Account",  href: `${base}/dashboard/homeowner`,           isActive: !!pathname?.includes("/dashboard") && !pathname?.includes("/saved") },
    ]
    return <BottomNav items={items} unreadMessages={unreadMessages} unreadNotifications={0} />
  }

  // ── Tradesperson nav ───────────────────────────────────────────────────────
  if (isTradesperson) {
    const jobsUrl = `${base}/?tab=jobs_tasks`
    const items = [
      { key: "home",          icon: Home,          label: "Home",          href: `${base}/`,              isActive: pathname === "/" || pathname === "/br" },
      { key: "messages",      icon: MessageCircle, label: "Messages",      href: `${base}/messages`,      isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
      { key: "jobs",          icon: Map,           label: "Jobs",          href: jobsUrl,                 isActive: false, isCenter: true, centerColor: "bg-orange-500 shadow-orange-500/30 hover:bg-orange-600" },
      { key: "notifications", icon: Bell,          label: "Alerts",        href: `${base}/notifications`, isActive: !!pathname?.includes("/notifications"), badge: unreadNotifications },
      { key: "account",       icon: User,          label: "Account",       href: getDashboardUrl(),       isActive: !!pathname?.includes("/dashboard") && !pathname?.includes("/saved") },
    ]
    return <BottomNav items={items} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
  }

  // ── Fallback (unknown role) ────────────────────────────────────────────────
  const fallbackItems = [
    { key: "search",   icon: Home,          label: "Search",   href: `${base}/`,         isActive: pathname === "/" || pathname === "/br" },
    { key: "messages", icon: MessageCircle, label: "Messages", href: `${base}/messages`, isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
    { key: "account",  icon: User,          label: "Account",  href: getDashboardUrl(),  isActive: !!pathname?.includes("/dashboard") },
  ]
  return <BottomNav items={fallbackItems} unreadMessages={unreadMessages} unreadNotifications={0} />
}

// ── Shared renderer ────────────────────────────────────────────────────────────
interface NavItem {
  key: string
  icon: React.ElementType
  label: string
  href: string
  isActive: boolean
  isCenter?: boolean
  centerColor?: string
  badge?: number
}

function BottomNav({ items, unreadMessages, unreadNotifications }: { items: NavItem[], unreadMessages: number, unreadNotifications: number }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 border-t border-slate-700 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link key={item.key} href={item.href} className="flex flex-col items-center justify-center -mt-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${item.centerColor || "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600"}`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <span className="text-xs mt-1 text-slate-400 font-medium">{item.label}</span>
              </Link>
            )
          }

          const badgeCount = item.badge || 0

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative ${
                item.isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${item.isActive ? "stroke-[2.5]" : ""}`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${item.isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {item.isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
