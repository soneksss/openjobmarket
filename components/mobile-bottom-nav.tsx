"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, MessageCircle, Plus, Bookmark, User, Map, Bell } from "lucide-react"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"

interface MobileBottomNavProps {
  user?: { id: string; user_metadata?: any } | null
  userType?: string | null
}

export function MobileBottomNav({ user: serverUser, userType: serverUserType }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useTranslation()
  const supabase = createClient()

  // Client-side auth fallback — kicks in if server-side auth didn't find the user
  const [clientUser, setClientUser] = useState<{ id: string; user_metadata?: any } | null>(null)
  const [clientUserType, setClientUserType] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(!!serverUser)

  useEffect(() => {
    if (serverUser) { setAuthChecked(true); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setClientUser(user)
        const { data } = await supabase.from("users").select("user_type").eq("id", user.id).maybeSingle()
        setClientUserType(data?.user_type ?? user.user_metadata?.user_type ?? null)
      }
      setAuthChecked(true)
    })
  }, [serverUser])

  // Listen for auth state changes (sign-in/sign-out) — mirrors what the Header does
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data } = await supabase.from("users").select("user_type").eq("id", session.user.id).maybeSingle()
        setClientUser(session.user)
        setClientUserType(data?.user_type ?? session.user.user_metadata?.user_type ?? null)
        setAuthChecked(true)
      } else if (event === 'SIGNED_OUT') {
        setClientUser(null)
        setClientUserType(null)
        setAuthChecked(true)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [])

  const user = serverUser ?? clientUser
  const userType = serverUserType ?? clientUserType
  const userId = user?.id

  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [jobsSearchUrl, setJobsSearchUrl] = useState<string | null>(null)

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

  // Fetch tradesperson profile to build a personalised jobs search URL
  useEffect(() => {
    if (!userId) return
    const isTrade = serverUserType === "company" || clientUserType === "company"
    if (!isTrade) return

    const buildUrl = (lat: number | null, lng: number | null, locationName: string | null, skills: string[]) => {
      const params = new URLSearchParams()
      params.set("tab", "jobs_tasks")
      params.set("autoSearch", "true")
      if (lat && lng) {
        // Use "Near Me" — the actual lat/lng drives the search, not the label
        params.set("location", "Near Me")
        params.set("lat", lat.toString())
        params.set("lng", lng.toString())
        params.set("radius", "5")
      } else {
        params.set("location", "London, UK")
        params.set("lat", "51.5074")
        params.set("lng", "-0.1278")
        params.set("radius", "10")
      }
      const cleanSkills = skills.filter(Boolean).slice(0, 3)
      if (cleanSkills.length > 0) {
        params.set("skills", cleanSkills.join(","))
        params.set("search", cleanSkills[0]) // primary search term
      }
      return `/?${params.toString()}`
    }

    const effectiveUserType = userType
    if (effectiveUserType === "company") {
      // Company (tradesperson) → use company_profiles (industry + services)
      supabase.from("company_profiles")
        .select("industry, services, location, latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const skills = [
              data.industry,
              ...(Array.isArray(data.services) ? data.services.slice(0, 2) : []),
            ].filter(Boolean) as string[]
            setJobsSearchUrl(buildUrl(data.latitude, data.longitude, data.location, skills))
          } else {
            setJobsSearchUrl("/?tab=jobs_tasks&autoSearch=true&location=London%2C+UK&lat=51.5074&lng=-0.1278&radius=10")
          }
        })
    } else {
      // Fallback — try professional_profiles for any legacy users
      supabase.from("professional_profiles")
        .select("title, skills, location, latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data: prof }) => {
          if (prof) {
            const skills = [
              prof.title,
              ...(Array.isArray(prof.skills) ? prof.skills.slice(0, 2) : []),
            ].filter(Boolean) as string[]
            setJobsSearchUrl(buildUrl(prof.latitude, prof.longitude, prof.location, skills))
          } else {
            // Fallback to company_profiles
            supabase.from("company_profiles")
              .select("industry, location, latitude, longitude")
              .eq("user_id", userId)
              .maybeSingle()
              .then(({ data: comp }) => {
                if (comp) {
                  setJobsSearchUrl(buildUrl(comp.latitude, comp.longitude, comp.location, [comp.industry].filter(Boolean) as string[]))
                } else {
                  setJobsSearchUrl("/?tab=jobs_tasks&autoSearch=true&location=London%2C+UK&lat=51.5074&lng=-0.1278&radius=10")
                }
              })
          }
        })
    }
  }, [userId, userType])

  if (!authChecked) return null
  if (!user) return null

  const getDashboardUrl = () => {
    if (userType === "company") return `${base}/dashboard/company`
    if (userType === "homeowner") return `${base}/dashboard/homeowner`
    return `${base}/dashboard`
  }

  const isHomeowner = userType === "homeowner"
  const isTradesperson = userType === "company"

  // ── Homeowner nav ──────────────────────────────────────────────────────────
  if (isHomeowner) {
    const items = [
      { key: "search",        icon: Home,          label: "Search",       href: `${base}/`,                     isActive: pathname === "/" || pathname === "/br" },
      { key: "messages",      icon: MessageCircle, label: "Messages",     href: `${base}/messages`,             isActive: !!pathname?.includes("/messages"), badge: unreadMessages },
      { key: "post",          icon: Plus,          label: "Post",         href: `${base}/jobs/new`,             isActive: !!pathname?.includes("/jobs/new"), isCenter: true },
      { key: "notifications", icon: Bell,          label: "Alerts",       href: `${base}/notifications`,        isActive: !!pathname?.includes("/notifications"), badge: unreadNotifications },
      { key: "account",       icon: User,          label: "Account",      href: `${base}/dashboard/homeowner`,  isActive: !!pathname?.includes("/dashboard") },
    ]
    return <BottomNav items={items} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
  }

  // ── Tradesperson nav ───────────────────────────────────────────────────────
  if (isTradesperson) {
    const defaultJobsUrl = "/?tab=jobs_tasks&autoSearch=true"
    const jobsUrl = `${base}${(jobsSearchUrl || defaultJobsUrl)}`
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
